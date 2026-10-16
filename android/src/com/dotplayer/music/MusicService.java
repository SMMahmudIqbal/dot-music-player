package com.dotplayer.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadata;
import android.media.MediaMetadataRetriever;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.ParcelFileDescriptor;
import android.os.PowerManager;
import android.os.SystemClock;
import android.provider.MediaStore;

import java.io.InputStream;

/**
 * Background Music Playback Foreground Service & Android SystemUI Media Control
 * Renders rich Notification & Lockscreen Media Card with live seek scrubber and album artwork.
 * Author: Developed by S. M. Mahmud Iqbal
 */
public class MusicService extends Service {
    public static final String CHANNEL_ID = "dot_music_playback";
    public static final int NOTIFICATION_ID = 101;

    public static final String ACTION_START_OR_UPDATE = "com.dotplayer.music.ACTION_UPDATE";
    public static final String ACTION_UPDATE_POSITION = "com.dotplayer.music.ACTION_UPDATE_POS";
    public static final String ACTION_TOGGLE = "com.dotplayer.music.ACTION_TOGGLE";
    public static final String ACTION_NEXT = "com.dotplayer.music.ACTION_NEXT";
    public static final String ACTION_PREV = "com.dotplayer.music.ACTION_PREV";
    public static final String ACTION_STOP = "com.dotplayer.music.ACTION_STOP";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_ALBUM = "extra_album";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";
    public static final String EXTRA_DURATION = "extra_duration";
    public static final String EXTRA_POSITION = "extra_position";
    public static final String EXTRA_MEDIA_ID = "extra_media_id";
    public static final String EXTRA_ALBUM_ID = "extra_album_id";

    private PowerManager.WakeLock mWakeLock;
    private MediaSession mMediaSession;
    private NotificationManager mNotificationManager;

    private String mCurrentTitle = "Dot Music Player";
    private String mCurrentArtist = "Offline Audio";
    private String mCurrentAlbum = "Nothing OS";
    private boolean mIsPlaying = false;
    private long mDurationMs = 0;
    private long mPositionMs = 0;
    private long mMediaId = -1;
    private long mAlbumId = -1;
    private Bitmap mCachedArt = null;
    private long mLastArtMediaId = -2;

    @Override
    public void onCreate() {
        super.onCreate();
        mNotificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Acquire partial WakeLock to keep CPU alive during background playback
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            mWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DotMusic:PlaybackWakeLock");
            mWakeLock.setReferenceCounted(false);
        }

        createNotificationChannel();
        initMediaSession();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Dot Music Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background audio playback controls and notification");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            if (mNotificationManager != null) {
                mNotificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void initMediaSession() {
        mMediaSession = new MediaSession(this, "DotMusicSession");
        mMediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                MainActivity.triggerPlayPause();
            }

            @Override
            public void onPause() {
                MainActivity.triggerPlayPause();
            }

            @Override
            public void onSkipToNext() {
                MainActivity.triggerNext();
            }

            @Override
            public void onSkipToPrevious() {
                MainActivity.triggerPrev();
            }

            @Override
            public void onSeekTo(long pos) {
                mPositionMs = pos;
                updatePlaybackState(mIsPlaying);
                MainActivity.triggerSeek(pos);
            }

            @Override
            public void onStop() {
                stopSelf();
            }
        });
        mMediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();

            if (ACTION_START_OR_UPDATE.equals(action)) {
                String title = intent.getStringExtra(EXTRA_TITLE);
                String artist = intent.getStringExtra(EXTRA_ARTIST);
                String album = intent.getStringExtra(EXTRA_ALBUM);
                boolean isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, true);
                long duration = intent.getLongExtra(EXTRA_DURATION, mDurationMs);
                long position = intent.getLongExtra(EXTRA_POSITION, mPositionMs);
                long mediaId = intent.getLongExtra(EXTRA_MEDIA_ID, mMediaId);
                long albumId = intent.getLongExtra(EXTRA_ALBUM_ID, mAlbumId);

                if (title != null) mCurrentTitle = title;
                if (artist != null) mCurrentArtist = artist;
                if (album != null) mCurrentAlbum = album;
                mIsPlaying = isPlaying;
                if (duration > 0) mDurationMs = duration;
                mPositionMs = Math.max(0, position);
                mMediaId = mediaId;
                mAlbumId = albumId;

                // Reload artwork if track changed
                if (mMediaId != mLastArtMediaId) {
                    mCachedArt = loadAlbumArt(mAlbumId, mMediaId);
                    mLastArtMediaId = mMediaId;
                }

                updatePlaybackState(mIsPlaying);
                Notification notification = buildNotification();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }

                if (mIsPlaying) {
                    acquireWakeLock();
                } else {
                    releaseWakeLock();
                }

            } else if (ACTION_UPDATE_POSITION.equals(action)) {
                long pos = intent.getLongExtra(EXTRA_POSITION, mPositionMs);
                boolean isPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, mIsPlaying);
                mPositionMs = Math.max(0, pos);
                mIsPlaying = isPlaying;
                updatePlaybackState(mIsPlaying);

            } else if (ACTION_TOGGLE.equals(action)) {
                MainActivity.triggerPlayPause();
            } else if (ACTION_NEXT.equals(action)) {
                MainActivity.triggerNext();
            } else if (ACTION_PREV.equals(action)) {
                MainActivity.triggerPrev();
            } else if (ACTION_STOP.equals(action)) {
                MainActivity.triggerStop();
                releaseWakeLock();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }
        }

        return START_STICKY;
    }

    private void updatePlaybackState(boolean isPlaying) {
        if (mMediaSession == null) return;

        long actions = PlaybackState.ACTION_PLAY |
                       PlaybackState.ACTION_PAUSE |
                       PlaybackState.ACTION_PLAY_PAUSE |
                       PlaybackState.ACTION_SKIP_TO_NEXT |
                       PlaybackState.ACTION_SKIP_TO_PREVIOUS |
                       PlaybackState.ACTION_SEEK_TO |
                       PlaybackState.ACTION_STOP;

        float speed = isPlaying ? 1.0f : 0.0f;
        PlaybackState state = new PlaybackState.Builder()
            .setActions(actions)
            .setState(isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                      mPositionMs,
                      speed,
                      SystemClock.elapsedRealtime())
            .build();
        mMediaSession.setPlaybackState(state);

        MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, mCurrentTitle)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, mCurrentArtist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, mCurrentAlbum)
            .putLong(MediaMetadata.METADATA_KEY_DURATION, mDurationMs > 0 ? mDurationMs : -1);

        if (mCachedArt != null) {
            metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, mCachedArt);
            metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ART, mCachedArt);
        }

        mMediaSession.setMetadata(metaBuilder.build());
    }

    private Bitmap loadAlbumArt(long albumId, long mediaId) {
        // 1. Try content://media/external/audio/albumart/<albumId>
        if (albumId > 0) {
            try {
                Uri artUri = ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId);
                InputStream is = getContentResolver().openInputStream(artUri);
                if (is != null) {
                    Bitmap bmp = BitmapFactory.decodeStream(is);
                    is.close();
                    if (bmp != null) return bmp;
                }
            } catch (Exception ignored) {}
        }

        // 2. Try MediaMetadataRetriever from MediaStore track URI
        if (mediaId > 0) {
            try {
                Uri trackUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, mediaId);
                ParcelFileDescriptor pfd = getContentResolver().openFileDescriptor(trackUri, "r");
                if (pfd != null) {
                    MediaMetadataRetriever mmr = new MediaMetadataRetriever();
                    mmr.setDataSource(pfd.getFileDescriptor());
                    byte[] raw = mmr.getEmbeddedPicture();
                    mmr.release();
                    pfd.close();
                    if (raw != null && raw.length > 0) {
                        Bitmap bmp = BitmapFactory.decodeByteArray(raw, 0, raw.length);
                        if (bmp != null) return bmp;
                    }
                }
            } catch (Exception ignored) {}
        }

        // 3. Fallback: app launcher icon as circular/square bitmap
        try {
            return BitmapFactory.decodeResource(getResources(), R.drawable.ic_launcher);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Notification buildNotification() {
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pContentIntent = PendingIntent.getActivity(
            this, 0, contentIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent pPrev = PendingIntent.getService(
            this, 1, new Intent(this, MusicService.class).setAction(ACTION_PREV), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent pToggle = PendingIntent.getService(
            this, 2, new Intent(this, MusicService.class).setAction(ACTION_TOGGLE), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent pNext = PendingIntent.getService(
            this, 3, new Intent(this, MusicService.class).setAction(ACTION_NEXT), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent pClose = PendingIntent.getService(
            this, 4, new Intent(this, MusicService.class).setAction(ACTION_STOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        int playPauseIcon = mIsPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playPauseText = mIsPlaying ? "Pause" : "Play";

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        builder.setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle(mCurrentTitle)
            .setContentText(mCurrentArtist + (mCurrentAlbum != null && !mCurrentAlbum.isEmpty() ? " // " + mCurrentAlbum : ""))
            .setContentIntent(pContentIntent)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(mIsPlaying)
            .setShowWhen(false)
            .addAction(android.R.drawable.ic_media_previous, "Prev", pPrev)
            .addAction(playPauseIcon, playPauseText, pToggle)
            .addAction(android.R.drawable.ic_media_next, "Next", pNext)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Close", pClose);

        if (mCachedArt != null) {
            builder.setLargeIcon(mCachedArt);
        }

        if (mMediaSession != null) {
            Notification.MediaStyle mediaStyle = new Notification.MediaStyle();
            mediaStyle.setMediaSession(mMediaSession.getSessionToken());
            // Show Prev (0), Play/Pause (1), Next (2) in compact lockscreen/notification view
            mediaStyle.setShowActionsInCompactView(0, 1, 2);
            builder.setStyle(mediaStyle);
        }

        return builder.build();
    }

    private void acquireWakeLock() {
        if (mWakeLock != null && !mWakeLock.isHeld()) {
            mWakeLock.acquire();
        }
    }

    private void releaseWakeLock() {
        if (mWakeLock != null && mWakeLock.isHeld()) {
            mWakeLock.release();
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        releaseWakeLock();
        if (mMediaSession != null) {
            mMediaSession.release();
        }
        super.onDestroy();
    }
}
