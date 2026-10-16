package com.dotplayer.music;

import android.Manifest;
import android.app.Activity;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.provider.MediaStore;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * Dot Music Player - Native Android Host & MediaStore Bridge
 * Author: Developed by S. M. Mahmud Iqbal
 */
public class MainActivity extends Activity {
    private WebView mWebView;
    private ValueCallback<Uri[]> mFilePathCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private static final int PERMISSION_REQUEST_CODE = 2001;

    private LocalMediaServer mMediaServer;
    private int mServerPort = 0;
    private String mCachedTracksJson = null;
    private boolean mIsPageLoaded = false;
    private static MainActivity sInstance;

    public static void triggerPlayPause() {
        if (sInstance != null && sInstance.mWebView != null) {
            sInstance.runOnUiThread(() -> {
                sInstance.mWebView.evaluateJavascript("if (window.audioEngine) { window.audioEngine.togglePlay(); }", null);
            });
        }
    }

    public static void triggerNext() {
        if (sInstance != null && sInstance.mWebView != null) {
            sInstance.runOnUiThread(() -> {
                sInstance.mWebView.evaluateJavascript("if (window.playNextTrack) { window.playNextTrack(); }", null);
            });
        }
    }

    public static void triggerPrev() {
        if (sInstance != null && sInstance.mWebView != null) {
            sInstance.runOnUiThread(() -> {
                sInstance.mWebView.evaluateJavascript("if (window.playPrevTrack) { window.playPrevTrack(); }", null);
            });
        }
    }

    public static void triggerStop() {
        if (sInstance != null && sInstance.mWebView != null) {
            sInstance.runOnUiThread(() -> {
                sInstance.mWebView.evaluateJavascript("if (window.audioEngine) { window.audioEngine.pause(); }", null);
            });
        }
    }

    public static void triggerSeek(long positionMs) {
        if (sInstance != null && sInstance.mWebView != null) {
            double seconds = positionMs / 1000.0;
            sInstance.runOnUiThread(() -> {
                sInstance.mWebView.evaluateJavascript("if (window.audioEngine) { window.audioEngine.seek(" + seconds + "); }", null);
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        sInstance = this;

        // Keep screen alive during playback and style system status/nav bar
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(0xFF050505);
            window.setNavigationBarColor(0xFF050505);
        }

        // Start Local HTTP Streaming Server for MediaStore content
        startLocalMediaServer();

        // Initialize WebView
        mWebView = new WebView(this);
        setContentView(mWebView);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        mWebView.setBackgroundColor(0xFF050505);
        mWebView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

        // Bridge Native Android capabilities to JavaScript
        mWebView.addJavascriptInterface(new AndroidBridge(), "AndroidApp");

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                mIsPageLoaded = true;
                if (mCachedTracksJson != null) {
                    dispatchScannedTracksToWeb(mCachedTracksJson);
                } else {
                    checkPermissionsAndScan();
                }
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                try {
                    Intent intent = fileChooserParams.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("audio/*");
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(Intent.createChooser(intent, "Select Audio Files"), FILE_CHOOSER_REQUEST_CODE);
                    return true;
                } catch (Exception e) {
                    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("audio/*");
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(Intent.createChooser(intent, "Select Audio Files"), FILE_CHOOSER_REQUEST_CODE);
                    return true;
                }
            }
        });

        // Load offline local application from assets
        mWebView.loadUrl("file:///android_asset/index.html");

        // Check and request permissions on start
        checkPermissionsAndScan();
    }

    private void startLocalMediaServer() {
        try {
            mMediaServer = new LocalMediaServer();
            mServerPort = mMediaServer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean hasStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return checkSelfPermission(Manifest.permission.READ_MEDIA_AUDIO) == PackageManager.PERMISSION_GRANTED;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private void checkPermissionsAndScan() {
        if (hasStoragePermission()) {
            performDeviceAudioScan();
        } else {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                requestPermissions(new String[]{
                    Manifest.permission.READ_MEDIA_AUDIO,
                    Manifest.permission.POST_NOTIFICATIONS
                }, PERMISSION_REQUEST_CODE);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                requestPermissions(new String[]{
                    Manifest.permission.READ_EXTERNAL_STORAGE
                }, PERMISSION_REQUEST_CODE);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean granted = false;
            if (grantResults != null && grantResults.length > 0) {
                granted = grantResults[0] == PackageManager.PERMISSION_GRANTED;
            }
            if (granted) {
                performDeviceAudioScan();
            } else {
                Toast.makeText(this, "Storage permission required to scan device audio", Toast.LENGTH_LONG).show();
            }
        }
    }

    /**
     * Scans MediaStore for all audio files across internal storage and SD cards.
     */
    private void performDeviceAudioScan() {
        new Thread(() -> {
            try {
                String jsonResult = queryMediaStoreAudio();
                mCachedTracksJson = jsonResult;
                runOnUiThread(() -> {
                    if (mIsPageLoaded && mWebView != null) {
                        dispatchScannedTracksToWeb(jsonResult);
                    }
                });
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    /**
     * Music Audio Filter:
     * - Minimum duration >= 90 seconds (1.5 minutes = 90,000 milliseconds).
     * - Strictly excludes call recordings, phone recordings, and call recorder apps.
     * - Strictly excludes voice notes, WhatsApp/Telegram audio, and voice memos.
     * - Strictly excludes system sounds, ringtones, notifications, and alarms.
     */
    public static boolean isMusicTrack(String title, String artist, String album, String filePath, long durationMs) {
        // 1. Strict 1.5-minute threshold (90,000 ms)
        if (durationMs < 90000) {
            return false;
        }

        String path = (filePath != null ? filePath : "").replace('\\', '/').toLowerCase(java.util.Locale.ROOT);
        String t = (title != null ? title : "").toLowerCase(java.util.Locale.ROOT);
        String a = (artist != null ? artist : "").toLowerCase(java.util.Locale.ROOT);
        String al = (album != null ? album : "").toLowerCase(java.util.Locale.ROOT);

        // 2. Reject call recording directories & app folders
        if (path.contains("/call recordings/") || 
            path.contains("/call_recordings/") || 
            path.contains("/callrecordings/") || 
            path.contains("/phone recordings/") || 
            path.contains("/phone_recordings/") || 
            path.contains("/cubeacr/") || 
            path.contains("/cube_acr/") || 
            path.contains("/truecaller/") || 
            path.contains("/autocallrecord/") || 
            path.contains("/auto_call_record/") || 
            path.contains("/callrecorder/") || 
            path.contains("/call_recorder/") || 
            path.contains("/callx/") || 
            path.contains("/sound_recorder/call_rec/") || 
            path.contains("/sound recorder/call_rec/") || 
            path.contains("/recordings/call/") || 
            path.contains("/voice memos/") || 
            path.contains("/voicerecorder/") || 
            path.contains("/voice_recorder/") || 
            path.contains("/voice recorder/") || 
            path.contains("/soundrecorder/") || 
            path.contains("/sound_recorder/") || 
            path.contains("/sound recorder/")) {
            return false;
        }

        // 3. Reject call recording filename signatures
        String filename = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;
        if (filename.startsWith("call_") || 
            filename.startsWith("call-") || 
            filename.startsWith("call@") || 
            filename.startsWith("call ") || 
            filename.startsWith("rec_call") || 
            filename.startsWith("callrec") || 
            filename.startsWith("call_rec") || 
            filename.startsWith("incoming_") || 
            filename.startsWith("outgoing_") || 
            filename.startsWith("voice_") || 
            filename.startsWith("voicenote_") || 
            filename.startsWith("voice-") || 
            filename.startsWith("audiorecord_") || 
            filename.startsWith("aud-") || 
            filename.startsWith("ptt-") || 
            filename.startsWith("rec202") || 
            filename.startsWith("rec_202")) {
            return false;
        }

        // 4. Reject messaging voice notes & non-music audio directories
        if (path.contains("/whatsapp/media/") || 
            path.contains("/whatsapp audio/") || 
            path.contains("/whatsapp voice notes/") || 
            path.contains("/telegram/telegram audio/") || 
            path.contains("/com.whatsapp/") || 
            path.contains("/org.telegram/") || 
            path.contains("/com.facebook.orca/") || 
            path.contains("/ringtones/") || 
            path.contains("/notifications/") || 
            path.contains("/alarms/") || 
            path.contains("/ui/") || 
            path.contains("/system/media/") || 
            path.contains("/audiobooks/") || 
            path.contains("/podcasts/")) {
            return false;
        }

        // 5. Inspect Title & Metadata
        if (t.startsWith("call@") || 
            t.startsWith("call_") || 
            t.startsWith("call-") || 
            t.startsWith("call recording") || 
            t.startsWith("phone call") || 
            t.startsWith("incoming call") || 
            t.startsWith("outgoing call") || 
            t.startsWith("voice note") || 
            t.startsWith("voice memo") || 
            t.startsWith("rec_") || 
            t.startsWith("rec202") || 
            t.startsWith("record_") || 
            t.matches("^call\\s+(\\+?[0-9]{6,}|with|from|to).*")) {
            return false;
        }

        if (a.equals("call recorder") || 
            a.equals("sound recorder") || 
            a.equals("voice recorder") || 
            al.contains("call recording") || 
            al.contains("call recordings") || 
            al.contains("voice memos") || 
            al.contains("sound recorder")) {
            return false;
        }

        return true;
    }

    private String queryMediaStoreAudio() {
        JSONArray trackArray = new JSONArray();
        Uri audioUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;

        String[] projection = new String[]{
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.ALBUM_ID,
            MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.IS_RINGTONE,
            MediaStore.Audio.Media.IS_NOTIFICATION,
            MediaStore.Audio.Media.IS_ALARM
        };

        // Strict 1.5-minute duration threshold (90,000 ms) and exclude ringtones/notifications/alarms
        String selection = MediaStore.Audio.Media.DURATION + " >= 90000"
            + " AND (" + MediaStore.Audio.Media.IS_RINGTONE + " = 0)"
            + " AND (" + MediaStore.Audio.Media.IS_NOTIFICATION + " = 0)"
            + " AND (" + MediaStore.Audio.Media.IS_ALARM + " = 0)";
        String sortOrder = MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC";

        Cursor cursor = null;
        try {
            cursor = getContentResolver().query(audioUri, projection, selection, null, sortOrder);
            if (cursor != null && cursor.moveToFirst()) {
                int idCol = cursor.getColumnIndex(MediaStore.Audio.Media._ID);
                int titleCol = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE);
                int artistCol = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST);
                int albumCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM);
                int durCol = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION);
                int sizeCol = cursor.getColumnIndex(MediaStore.Audio.Media.SIZE);
                int mimeCol = cursor.getColumnIndex(MediaStore.Audio.Media.MIME_TYPE);
                int albumIdCol = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID);
                int dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA);

                while (!cursor.isAfterLast()) {
                    long id = cursor.getLong(idCol);
                    String title = cursor.getString(titleCol);
                    String artist = cursor.getString(artistCol);
                    String album = cursor.getString(albumCol);
                    long durationMs = cursor.getLong(durCol);
                    long size = cursor.getLong(sizeCol);
                    String mime = cursor.getString(mimeCol);
                    long albumId = cursor.getLong(albumIdCol);
                    String filePath = dataCol != -1 ? cursor.getString(dataCol) : "";

                    if (title == null || title.trim().isEmpty()) {
                        if (filePath != null && !filePath.isEmpty()) {
                            int slash = filePath.lastIndexOf('/');
                            title = slash != -1 ? filePath.substring(slash + 1) : filePath;
                        } else {
                            title = "Track " + id;
                        }
                    }

                    if (artist == null || artist.equals("<unknown>")) artist = "Unknown Artist";
                    if (album == null || album.equals("<unknown>")) album = "Local Audio";

                    // Apply strict music song filter (>= 1.5 mins, no call recordings, no voice notes)
                    if (!isMusicTrack(title, artist, album, filePath, durationMs)) {
                        cursor.moveToNext();
                        continue;
                    }

                    String format = "MP3";
                    if (mime != null) {
                        if (mime.contains("flac")) format = "FLAC";
                        else if (mime.contains("wav")) format = "WAV";
                        else if (mime.contains("ogg")) format = "OGG";
                        else if (mime.contains("opus")) format = "OPUS";
                        else if (mime.contains("mp4") || mime.contains("m4a") || mime.contains("aac")) format = "M4A";
                    } else if (filePath != null && filePath.contains(".")) {
                        format = filePath.substring(filePath.lastIndexOf('.') + 1).toUpperCase();
                    }

                    String folderName = "Internal Storage";
                    if (filePath != null && filePath.contains("/")) {
                        int lastSlash = filePath.lastIndexOf('/');
                        if (lastSlash > 0) {
                            int prevSlash = filePath.lastIndexOf('/', lastSlash - 1);
                            folderName = prevSlash != -1 ? filePath.substring(prevSlash + 1, lastSlash) : filePath.substring(0, lastSlash);
                        }
                    }

                    JSONObject trackObj = new JSONObject();
                    trackObj.put("id", "android_" + id);
                    trackObj.put("mediaId", id);
                    trackObj.put("title", title);
                    trackObj.put("artist", artist);
                    trackObj.put("album", album);
                    trackObj.put("folder", folderName);
                    trackObj.put("duration", durationMs / 1000);
                    trackObj.put("size", size);
                    trackObj.put("format", format);
                    trackObj.put("url", "http://127.0.0.1:" + mServerPort + "/audio?id=" + id);
                    trackObj.put("picture", "http://127.0.0.1:" + mServerPort + "/art?id=" + albumId + "&trackId=" + id);
                    trackObj.put("favorite", false);

                    trackArray.put(trackObj);
                    cursor.moveToNext();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (cursor != null) cursor.close();
        }

        return trackArray.toString();
    }

    private void dispatchScannedTracksToWeb(String jsonString) {
        if (mWebView != null) {
            mWebView.evaluateJavascript("if (window.onAndroidAudioScanned) { window.onAndroidAudioScanned(" + jsonString + "); }", null);
        }
    }

    /**
     * JavaScript Interface Bridge
     */
    public class AndroidBridge {
        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        @JavascriptInterface
        public int getServerPort() {
            return mServerPort;
        }

        @JavascriptInterface
        public void scanDeviceAudio() {
            runOnUiThread(() -> checkPermissionsAndScan());
        }

        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public String getAudioHardwareInfo() {
            try {
                JSONObject info = new JSONObject();
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                String deviceName = "INTERNAL STEREO";
                boolean isUsbDac = false;
                boolean isBluetooth = false;
                boolean isWired = false;

                if (am != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        AudioDeviceInfo[] devices = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                        if (devices != null) {
                            for (AudioDeviceInfo dev : devices) {
                                int type = dev.getType();
                                if (type == AudioDeviceInfo.TYPE_USB_DEVICE || type == AudioDeviceInfo.TYPE_USB_HEADSET) {
                                    deviceName = "USB DAC [BIT-PERFECT]";
                                    isUsbDac = true;
                                    break;
                                } else if (type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) {
                                    deviceName = "BLUETOOTH A2DP [HD AUDIO]";
                                    isBluetooth = true;
                                } else if (type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES || type == AudioDeviceInfo.TYPE_WIRED_HEADSET) {
                                    deviceName = "WIRED ANALOG 3.5MM [HI-RES]";
                                    isWired = true;
                                }
                            }
                        }
                    }

                    String sr = am.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE);
                    String buffer = am.getProperty(AudioManager.PROPERTY_OUTPUT_FRAMES_PER_BUFFER);

                    int sampleRate = sr != null ? Integer.parseInt(sr) : 48000;
                    int bufferFrames = buffer != null ? Integer.parseInt(buffer) : 192;
                    double latencyMs = (double) bufferFrames / (double) sampleRate * 1000.0;

                    info.put("deviceType", deviceName);
                    info.put("isUsbDac", isUsbDac);
                    info.put("isBluetooth", isBluetooth);
                    info.put("isWired", isWired);
                    info.put("sampleRate", sampleRate);
                    info.put("bufferFrames", bufferFrames);
                    info.put("latencyMs", Math.round(latencyMs * 10.0) / 10.0);
                    info.put("bitDepth", isUsbDac ? "32-BIT FLOAT" : "24-BIT / 48KHZ");
                }
                return info.toString();
            } catch (Exception e) {
                return "{\"deviceType\":\"HARDWARE STEREO\",\"sampleRate\":48000,\"latencyMs\":4.2,\"bitDepth\":\"24-BIT\"}";
            }
        }

        @JavascriptInterface
        public void vibrate(long ms) {
            runOnUiThread(() -> {
                try {
                    Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                    if (v != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                        } else {
                            v.vibrate(ms);
                        }
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void updatePlaybackState(boolean isPlaying, String title, String artist, String album, long durationMs, long positionMs, long mediaId, long albumId) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(MainActivity.this, MusicService.class);
                    intent.setAction(MusicService.ACTION_START_OR_UPDATE);
                    intent.putExtra(MusicService.EXTRA_IS_PLAYING, isPlaying);
                    intent.putExtra(MusicService.EXTRA_TITLE, title);
                    intent.putExtra(MusicService.EXTRA_ARTIST, artist);
                    intent.putExtra(MusicService.EXTRA_ALBUM, album);
                    intent.putExtra(MusicService.EXTRA_DURATION, durationMs);
                    intent.putExtra(MusicService.EXTRA_POSITION, positionMs);
                    intent.putExtra(MusicService.EXTRA_MEDIA_ID, mediaId);
                    intent.putExtra(MusicService.EXTRA_ALBUM_ID, albumId);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent);
                    } else {
                        startService(intent);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void updatePlaybackState(boolean isPlaying, String title, String artist, String album) {
            updatePlaybackState(isPlaying, title, artist, album, -1, 0, -1, -1);
        }

        @JavascriptInterface
        public void updatePlaybackPosition(long positionMs, boolean isPlaying) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(MainActivity.this, MusicService.class);
                    intent.setAction(MusicService.ACTION_UPDATE_POSITION);
                    intent.putExtra(MusicService.EXTRA_POSITION, positionMs);
                    intent.putExtra(MusicService.EXTRA_IS_PLAYING, isPlaying);
                    startService(intent);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void stopPlaybackService() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(MainActivity.this, MusicService.class);
                    intent.setAction(MusicService.ACTION_STOP);
                    startService(intent);
                } catch (Exception ignored) {}
            });
        }
    }

    /**
     * Lightweight Embedded Local HTTP Streaming Server
     * Enables HTML5 audio tag seeking, range requests, and Web Audio API node connection.
     */
    private class LocalMediaServer {
        private ServerSocket mServerSocket;
        private boolean mIsRunning = false;

        public int start() throws Exception {
            try {
                mServerSocket = new ServerSocket(28492, 50, InetAddress.getByName("127.0.0.1"));
            } catch (Exception e) {
                mServerSocket = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
            }
            mIsRunning = true;
            new Thread(this::listen).start();
            return mServerSocket.getLocalPort();
        }

        private void listen() {
            while (mIsRunning && !mServerSocket.isClosed()) {
                try {
                    Socket client = mServerSocket.accept();
                    new Thread(() -> handleClient(client)).start();
                } catch (Exception ignored) {}
            }
        }

        private void handleClient(Socket socket) {
            try {
                socket.setTcpNoDelay(true);
                socket.setSendBufferSize(65536);
                InputStream in = socket.getInputStream();
                OutputStream out = socket.getOutputStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(in));

                String requestLine = reader.readLine();
                if (requestLine == null || requestLine.isEmpty()) {
                    socket.close();
                    return;
                }

                String[] parts = requestLine.split(" ");
                if (parts.length < 2) {
                    socket.close();
                    return;
                }

                String method = parts[0].toUpperCase();
                String path = parts[1];
                String rangeHeader = null;
                String line;
                while ((line = reader.readLine()) != null && !line.isEmpty()) {
                    if (line.toLowerCase().startsWith("range:")) {
                        rangeHeader = line.substring(6).trim();
                    }
                }

                // Handle CORS preflight OPTIONS request
                if (method.equals("OPTIONS")) {
                    PrintWriter pw = new PrintWriter(new OutputStreamWriter(out, "UTF-8"));
                    pw.print("HTTP/1.1 204 No Content\r\n");
                    pw.print("Access-Control-Allow-Origin: *\r\n");
                    pw.print("Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n");
                    pw.print("Access-Control-Allow-Headers: Range, Content-Type, Accept, Origin\r\n");
                    pw.print("Access-Control-Max-Age: 86400\r\n");
                    pw.print("Connection: close\r\n\r\n");
                    pw.flush();
                    socket.close();
                    return;
                }

                if (path.startsWith("/audio?")) {
                    long mediaId = -1;
                    int qIdx = path.indexOf("id=");
                    if (qIdx != -1) {
                        int endIdx = path.indexOf('&', qIdx);
                        String idStr = endIdx == -1 ? path.substring(qIdx + 3) : path.substring(qIdx + 3, endIdx);
                        try { mediaId = Long.parseLong(idStr); } catch (Exception ignored) {}
                    }

                    if (mediaId != -1) {
                        Uri contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, mediaId);
                        ParcelFileDescriptor pfd = null;
                        try {
                            pfd = getContentResolver().openFileDescriptor(contentUri, "r");
                        } catch (Exception e) {
                            e.printStackTrace();
                        }

                        if (pfd != null) {
                            long fileLength = pfd.getStatSize();
                            String mimeType = getContentResolver().getType(contentUri);
                            if (mimeType == null) mimeType = "audio/mpeg";

                            if (fileLength <= 0) {
                                InputStream is = getContentResolver().openInputStream(contentUri);
                                if (is != null) {
                                    PrintWriter pw = new PrintWriter(new OutputStreamWriter(out, "UTF-8"));
                                    pw.print("HTTP/1.1 200 OK\r\n");
                                    pw.print("Content-Type: " + mimeType + "\r\n");
                                    pw.print("Access-Control-Allow-Origin: *\r\n");
                                    pw.print("Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n");
                                    pw.print("Access-Control-Allow-Headers: Range, Content-Type, Accept\r\n");
                                    pw.print("Connection: close\r\n\r\n");
                                    pw.flush();

                                    if (!method.equals("HEAD")) {
                                        java.io.BufferedOutputStream bos = new java.io.BufferedOutputStream(out, 65536);
                                        byte[] buffer = new byte[65536];
                                        int r;
                                        while ((r = is.read(buffer)) != -1) {
                                            bos.write(buffer, 0, r);
                                        }
                                        bos.flush();
                                    }
                                    is.close();
                                    pfd.close();
                                    return;
                                }
                            }

                            long start = 0;
                            long end = fileLength - 1;
                            boolean isPartial = false;

                            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                                String spec = rangeHeader.substring(6);
                                int dash = spec.indexOf('-');
                                if (dash != -1) {
                                    String sStr = spec.substring(0, dash).trim();
                                    String eStr = spec.substring(dash + 1).trim();
                                    if (!sStr.isEmpty()) start = Long.parseLong(sStr);
                                    if (!eStr.isEmpty()) end = Long.parseLong(eStr);
                                    if (end >= fileLength) end = fileLength - 1;
                                    isPartial = true;
                                }
                            }

                            long contentLength = end - start + 1;
                            PrintWriter pw = new PrintWriter(new OutputStreamWriter(out, "UTF-8"));
                            if (isPartial) {
                                pw.print("HTTP/1.1 206 Partial Content\r\n");
                                pw.print("Content-Range: bytes " + start + "-" + end + "/" + fileLength + "\r\n");
                            } else {
                                pw.print("HTTP/1.1 200 OK\r\n");
                            }
                            pw.print("Content-Type: " + mimeType + "\r\n");
                            pw.print("Content-Length: " + contentLength + "\r\n");
                            pw.print("Accept-Ranges: bytes\r\n");
                            pw.print("Access-Control-Allow-Origin: *\r\n");
                            pw.print("Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n");
                            pw.print("Access-Control-Allow-Headers: Range, Content-Type, Accept\r\n");
                            pw.print("Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges\r\n");
                            pw.print("Connection: close\r\n\r\n");
                            pw.flush();

                            if (!method.equals("HEAD")) {
                                FileInputStream fis = new FileInputStream(pfd.getFileDescriptor());
                                if (start > 0) {
                                    fis.getChannel().position(start);
                                }

                                java.io.BufferedOutputStream bos = new java.io.BufferedOutputStream(out, 65536);
                                byte[] buffer = new byte[65536];
                                long remaining = contentLength;
                                while (remaining > 0) {
                                    int toRead = (int) Math.min(buffer.length, remaining);
                                    int read = fis.read(buffer, 0, toRead);
                                    if (read <= 0) break;
                                    bos.write(buffer, 0, read);
                                    remaining -= read;
                                }
                                bos.flush();
                                fis.close();
                            }
                            pfd.close();
                        } else {
                            PrintWriter pw = new PrintWriter(new OutputStreamWriter(out, "UTF-8"));
                            pw.print("HTTP/1.1 404 Not Found\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n");
                            pw.flush();
                        }
                    } else {
                        PrintWriter pw = new PrintWriter(new OutputStreamWriter(out, "UTF-8"));
                        pw.print("HTTP/1.1 400 Bad Request\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n");
                        pw.flush();
                    }
                } else if (path.startsWith("/art?")) {
                    long albumId = -1;
                    long trackId = -1;
                    int qIdx = path.indexOf("id=");
                    if (qIdx != -1) {
                        int endIdx = path.indexOf('&', qIdx);
                        String idStr = endIdx == -1 ? path.substring(qIdx + 3) : path.substring(qIdx + 3, endIdx);
                        try { albumId = Long.parseLong(idStr); } catch (Exception ignored) {}
                    }
                    int tIdx = path.indexOf("trackId=");
                    if (tIdx != -1) {
                        int endIdx = path.indexOf('&', tIdx);
                        String idStr = endIdx == -1 ? path.substring(tIdx + 8) : path.substring(tIdx + 8, endIdx);
                        try { trackId = Long.parseLong(idStr); } catch (Exception ignored) {}
                    }

                    byte[] imgBytes = null;
                    if (albumId != -1) {
                        Uri artUri = ContentUris.withAppendedId(Uri.parse("content://media/external/audio/albumart"), albumId);
                        try {
                            InputStream is = getContentResolver().openInputStream(artUri);
                            if (is != null) {
                                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                byte[] buf = new byte[8192];
                                int r;
                                while ((r = is.read(buf)) != -1) baos.write(buf, 0, r);
                                is.close();
                                imgBytes = baos.toByteArray();
                            }
                        } catch (Exception ignored) {}
                    }

                    // Fallback: extract embedded album art from track file descriptor
                    if ((imgBytes == null || imgBytes.length == 0) && trackId != -1) {
                        try {
                            Uri trackUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, trackId);
                            ParcelFileDescriptor pfd = getContentResolver().openFileDescriptor(trackUri, "r");
                            if (pfd != null) {
                                android.media.MediaMetadataRetriever mmr = new android.media.MediaMetadataRetriever();
                                mmr.setDataSource(pfd.getFileDescriptor());
                                imgBytes = mmr.getEmbeddedPicture();
                                mmr.release();
                                pfd.close();
                            }
                        } catch (Exception ignored) {}
                    }

                    if (imgBytes != null && imgBytes.length > 0) {
                        PrintWriter pw = new PrintWriter(new OutputStreamWriter(out, "UTF-8"));
                        pw.print("HTTP/1.1 200 OK\r\n");
                        pw.print("Content-Type: image/jpeg\r\n");
                        pw.print("Content-Length: " + imgBytes.length + "\r\n");
                        pw.print("Access-Control-Allow-Origin: *\r\n");
                        pw.print("Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n");
                        pw.print("Connection: close\r\n\r\n");
                        pw.flush();
                        if (!method.equals("HEAD")) {
                            out.write(imgBytes);
                            out.flush();
                        }
                    } else {
                        PrintWriter pw = new PrintWriter(new OutputStreamWriter(out, "UTF-8"));
                        pw.print("HTTP/1.1 404 Not Found\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n");
                        pw.flush();
                    }
                }
            } catch (Exception ignored) {
            } finally {
                try { socket.close(); } catch (Exception ignored) {}
            }
        }

        public void stop() {
            mIsRunning = false;
            try {
                if (mServerSocket != null) mServerSocket.close();
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (mFilePathCallback == null) return;

            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{ data.getData() };
                }
            }
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            // Keep playback alive when user exits app with back button
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onDestroy() {
        if (sInstance == this) {
            sInstance = null;
        }
        if (mMediaServer != null) {
            mMediaServer.stop();
        }
        if (mWebView != null) {
            mWebView.destroy();
        }
        super.onDestroy();
    }
}
