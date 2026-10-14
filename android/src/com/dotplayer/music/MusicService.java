package com.dotplayer.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

/**
 * Background Music Playback Foreground Service
 * Keeps audio stream alive when screen is off or app is in background.
 * Author: Developed by S. M. Mahmud Iqbal
 */
public class MusicService extends Service {
    public static final String CHANNEL_ID = "dot_music_playback";
    public static final int NOTIFICATION_ID = 101;

    public static final String ACTION_START_OR_UPDATE = "com.dotplayer.music.ACTION_UPDATE";
    public static final String ACTION_TOGGLE = "com.dotplayer.music.ACTION_TOGGLE";
    public static final String ACTION_NEXT = "com.dotplayer.music.ACTION_NEXT";
    public static final String ACTION_PREV = "com.dotplayer.music.ACTION_PREV";
    public static final String ACTION_STOP = "com.dotplayer.music.ACTION_STOP";

    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_ARTIST = "extra_artist";
    public static final String EXTRA_ALBUM = "extra_album";
    public static final String EXTRA_IS_PLAYING = "extra_is_playing";

    private PowerManager.WakeLock mWakeLock;
    private MediaSession mMediaSession;
    private NotificationManager mNotificationManager;

    private String mCurrentTitle = "Dot Music Player";
    private String mCurrentArtist = "Offline Audio";
    private String mCurrentAlbum = "Nothing OS";
    private boolean mIsPlaying = false;

    @Override
    public void onCreate() {
        super.onCreate();
        mNotificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Acquire WakeLock to keep CPU alive during background playback
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

                if (title != null) mCurrentTitle = title;
                if (artist != null) mCurrentArtist = artist;
                if (album != null) mCurrentAlbum = album;
                mIsPlaying = isPlaying;

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

        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE |
                       PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS |
                       PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_STOP;

        PlaybackState state = new PlaybackState.Builder()
            .setActions(actions)
            .setState(isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                      PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1.0f)
            .build();
        mMediaSession.setPlaybackState(state);

        MediaMetadata metadata = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, mCurrentTitle)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, mCurrentArtist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, mCurrentAlbum)
            .build();
        mMediaSession.setMetadata(metadata);
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
            .setContentText(mCurrentArtist + " // " + mCurrentAlbum)
            .setContentIntent(pContentIntent)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(mIsPlaying)
            .setShowWhen(false)
            .addAction(android.R.drawable.ic_media_previous, "Prev", pPrev)
            .addAction(playPauseIcon, playPauseText, pToggle)
            .addAction(android.R.drawable.ic_media_next, "Next", pNext)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Close", pClose);

        if (mMediaSession != null) {
            Notification.MediaStyle mediaStyle = new Notification.MediaStyle();
            mediaStyle.setMediaSession(mMediaSession.getSessionToken());
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
