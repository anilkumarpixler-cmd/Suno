package expo.modules.sunomediasession

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.util.Log

/**
 * Foreground service that owns the MediaSession + media notification for story playback
 * (System Voice TTS and narrator tracks). It plays no audio: the voice is Android System TTS
 * (expo-speech) or the expo-audio player, both driven from JS.
 * Every user/system action is forwarded to JS as a command; JS then pushes the new state back.
 * It is promoted to foreground once and then only re-notifies, because Android 12+ rejects a
 * repeated startForeground() while the app is in the background.
 */
class SunoMediaSessionService : Service() {
  private lateinit var session: MediaSession
  private lateinit var audioManager: AudioManager
  private lateinit var notificationManager: NotificationManager
  private val mainHandler = Handler(Looper.getMainLooper())

  private var artwork: Bitmap? = null
  private var isForeground = false
  private var focusRequest: AudioFocusRequest? = null
  private var hasFocus = false
  private var resumeOnGain = false
  private var noisyRegistered = false

  private val sessionCallback = object : MediaSession.Callback() {
    override fun onPlay() = command(COMMAND_PLAY)
    override fun onPause() = command(COMMAND_PAUSE)
    override fun onStop() = command(COMMAND_STOP)
    override fun onSeekTo(pos: Long) = command(COMMAND_SEEK_TO, mapOf("positionMs" to pos.toDouble()))
    override fun onFastForward() = skip(SKIP_SECONDS)
    override fun onRewind() = skip(-SKIP_SECONDS)
    override fun onSkipToNext() = command(COMMAND_NEXT)
    override fun onSkipToPrevious() = command(COMMAND_PREVIOUS)

    override fun onCustomAction(action: String, extras: Bundle?) {
      when (action) {
        CUSTOM_FORWARD -> skip(SKIP_SECONDS)
        CUSTOM_REWIND -> skip(-SKIP_SECONDS)
      }
    }
  }

  private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
    when (change) {
      AudioManager.AUDIOFOCUS_LOSS -> {
        hasFocus = false
        resumeOnGain = false
        command(COMMAND_PAUSE, mapOf("reason" to "focusLoss"))
      }
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
        hasFocus = false
        if (SunoMediaSessionController.state?.playing == true) resumeOnGain = true
        command(COMMAND_PAUSE, mapOf("reason" to "transient"))
      }
      AudioManager.AUDIOFOCUS_GAIN -> {
        hasFocus = true
        if (resumeOnGain) {
          resumeOnGain = false
          command(COMMAND_PLAY, mapOf("reason" to "focusGain"))
        }
      }
      // TTS can't duck; keep speaking.
      else -> Unit
    }
  }

  private val noisyReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (intent.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) {
        command(COMMAND_PAUSE, mapOf("reason" to "noisy"))
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    audioManager = getSystemService(AUDIO_SERVICE) as AudioManager
    notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    createChannelIfNeeded()
    artwork = loadAppIcon()

    session = MediaSession(this, TAG).apply {
      setCallback(sessionCallback, mainHandler)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        @Suppress("DEPRECATION")
        setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS or MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS)
      }
      buildContentIntent()?.let { setSessionActivity(it) }
      isActive = true
    }
    SunoMediaSessionController.attach(this)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // A start that lands after shutdown() reuses this instance without a new onCreate().
    SunoMediaSessionController.attach(this)
    when (intent?.action) {
      ACTION_PLAY -> command(COMMAND_PLAY)
      ACTION_PAUSE -> command(COMMAND_PAUSE)
      ACTION_FORWARD -> skip(SKIP_SECONDS)
      ACTION_REWIND -> skip(-SKIP_SECONDS)
      ACTION_NEXT -> command(COMMAND_NEXT)
      ACTION_PREVIOUS -> command(COMMAND_PREVIOUS)
    }
    // startForegroundService() requires startForeground() even when JS already stopped the session.
    render()
    if (SunoMediaSessionController.state == null) shutdown()
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onTaskRemoved(rootIntent: Intent?) {
    command(COMMAND_STOP, mapOf("reason" to "taskRemoved"))
    shutdown()
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    releaseAudioHooks()
    session.isActive = false
    session.release()
    SunoMediaSessionController.detach(this)
    super.onDestroy()
  }

  /** Applies the latest JS state to the session, the notification and audio focus. */
  fun render() {
    val state = SunoMediaSessionController.state
    if (state == null) {
      if (!isForeground) promoteToForeground(buildPlaceholderNotification())
      return
    }

    session.setMetadata(
      MediaMetadata.Builder()
        .putString(MediaMetadata.METADATA_KEY_TITLE, state.title)
        .putString(MediaMetadata.METADATA_KEY_ARTIST, state.artist)
        .putString(MediaMetadata.METADATA_KEY_ALBUM, state.album)
        .putLong(MediaMetadata.METADATA_KEY_DURATION, state.durationMs)
        .apply { artwork?.let { putBitmap(MediaMetadata.METADATA_KEY_ART, it) } }
        .build()
    )
    session.setPlaybackState(buildPlaybackState(state))

    if (state.playing) registerNoisy() else unregisterNoisy()

    if (!state.manageAudioFocus) {
      // expo-audio requests focus for the narrator track; holding ours would make it pause.
      resumeOnGain = false
      abandonFocus()
    } else if (state.playing) {
      requestFocus()
    } else if (!resumeOnGain) {
      // Keep focus through a transient loss so the GAIN callback can resume playback.
      abandonFocus()
    }

    val notification = buildNotification(state)
    if (isForeground) {
      notificationManager.notify(NOTIFICATION_ID, notification)
    } else {
      promoteToForeground(notification)
    }
  }

  fun shutdown() {
    SunoMediaSessionController.detach(this)
    releaseAudioHooks()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    isForeground = false
    stopSelf()
  }

  private fun command(action: String, extras: Map<String, Any?> = emptyMap()) {
    SunoMediaSessionController.dispatch(action, extras)
  }

  private fun skip(seconds: Int) = command(COMMAND_SKIP, mapOf("offsetSec" to seconds))

  private fun buildPlaybackState(state: SessionState): PlaybackState {
    val actions = PlaybackState.ACTION_PLAY or
      PlaybackState.ACTION_PAUSE or
      PlaybackState.ACTION_PLAY_PAUSE or
      PlaybackState.ACTION_SEEK_TO or
      PlaybackState.ACTION_STOP or
      PlaybackState.ACTION_FAST_FORWARD or
      PlaybackState.ACTION_REWIND or
      PlaybackState.ACTION_SKIP_TO_NEXT or
      PlaybackState.ACTION_SKIP_TO_PREVIOUS

    // Android 13+ builds the card from this: previous / play-pause / next, then the ±10 s
    // custom actions in the two extra slots.
    return PlaybackState.Builder()
      .setActions(actions)
      .setState(
        if (state.playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
        state.positionMs,
        state.speed,
        SystemClock.elapsedRealtime()
      )
      .addCustomAction(
        PlaybackState.CustomAction.Builder(CUSTOM_REWIND, "Back $SKIP_SECONDS seconds", R.drawable.suno_media_rewind).build()
      )
      .addCustomAction(
        PlaybackState.CustomAction.Builder(CUSTOM_FORWARD, "Forward $SKIP_SECONDS seconds", R.drawable.suno_media_forward).build()
      )
      .build()
  }

  private fun buildNotification(state: SessionState): Notification {
    val playPause = if (state.playing) {
      notificationAction(R.drawable.suno_media_pause, "Pause", ACTION_PAUSE)
    } else {
      notificationAction(R.drawable.suno_media_play, "Play", ACTION_PLAY)
    }

    return newNotificationBuilder()
      .setSmallIcon(R.drawable.suno_media_play)
      .setContentTitle(state.title)
      .setContentText(state.artist)
      .setSubText(state.album)
      .apply { artwork?.let { setLargeIcon(it) } }
      .setContentIntent(buildContentIntent())
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setCategory(Notification.CATEGORY_TRANSPORT)
      .setShowWhen(false)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .addAction(notificationAction(R.drawable.suno_media_previous, "Previous story", ACTION_PREVIOUS))
      .addAction(notificationAction(R.drawable.suno_media_rewind, "Back $SKIP_SECONDS seconds", ACTION_REWIND))
      .addAction(playPause)
      .addAction(notificationAction(R.drawable.suno_media_forward, "Forward $SKIP_SECONDS seconds", ACTION_FORWARD))
      .addAction(notificationAction(R.drawable.suno_media_next, "Next story", ACTION_NEXT))
      .setStyle(
        Notification.MediaStyle()
          .setMediaSession(session.sessionToken)
          // Android 12 and older collapsed card: previous, play/pause, next.
          .setShowActionsInCompactView(0, 2, 4)
      )
      .build()
  }

  private fun buildPlaceholderNotification(): Notification =
    newNotificationBuilder()
      .setSmallIcon(R.drawable.suno_media_play)
      .setContentTitle(ALBUM_FALLBACK)
      .setCategory(Notification.CATEGORY_TRANSPORT)
      .setShowWhen(false)
      .build()

  private fun newNotificationBuilder(): Notification.Builder =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this).setPriority(Notification.PRIORITY_LOW)
    }

  private fun notificationAction(icon: Int, title: String, action: String): Notification.Action {
    val intent = Intent(this, SunoMediaSessionService::class.java).setAction(action)
    val pendingIntent = PendingIntent.getService(
      this,
      action.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    return Notification.Action.Builder(Icon.createWithResource(this, icon), title, pendingIntent).build()
  }

  private fun buildContentIntent(): PendingIntent? {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    return PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun promoteToForeground(notification: Notification) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      isForeground = true
    } catch (e: Exception) {
      Log.w(TAG, "Could not promote the media session service to foreground", e)
    }
  }

  private fun createChannelIfNeeded() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    if (notificationManager.getNotificationChannel(CHANNEL_ID) != null) return
    notificationManager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Story playback", NotificationManager.IMPORTANCE_LOW).apply {
        setShowBadge(false)
      }
    )
  }

  private fun loadAppIcon(): Bitmap? =
    try {
      val drawable = packageManager.getApplicationIcon(packageName)
      Bitmap.createBitmap(ARTWORK_SIZE, ARTWORK_SIZE, Bitmap.Config.ARGB_8888).also { bitmap ->
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
      }
    } catch (e: Exception) {
      null
    }

  private fun requestFocus() {
    if (hasFocus) return
    val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = focusRequest ?: AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        .setOnAudioFocusChangeListener(focusListener, mainHandler)
        .build()
        .also { focusRequest = it }
      audioManager.requestAudioFocus(request)
    } else {
      @Suppress("DEPRECATION")
      audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
    }
    hasFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
  }

  private fun abandonFocus() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      audioManager.abandonAudioFocus(focusListener)
    }
    hasFocus = false
  }

  private fun registerNoisy() {
    if (noisyRegistered) return
    val filter = IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(noisyReceiver, filter, RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(noisyReceiver, filter)
    }
    noisyRegistered = true
  }

  private fun unregisterNoisy() {
    if (!noisyRegistered) return
    try {
      unregisterReceiver(noisyReceiver)
    } catch (e: IllegalArgumentException) {
      // Already unregistered.
    }
    noisyRegistered = false
  }

  private fun releaseAudioHooks() {
    unregisterNoisy()
    resumeOnGain = false
    abandonFocus()
  }

  companion object {
    private const val TAG = "SunoMediaSession"
    private const val CHANNEL_ID = "suno_playback"
    private const val NOTIFICATION_ID = 7310
    private const val ARTWORK_SIZE = 256
    private const val SKIP_SECONDS = 10
    private const val ALBUM_FALLBACK = "Suno Stories"

    private const val ACTION_PLAY = "expo.modules.sunomediasession.PLAY"
    private const val ACTION_PAUSE = "expo.modules.sunomediasession.PAUSE"
    private const val ACTION_FORWARD = "expo.modules.sunomediasession.FORWARD"
    private const val ACTION_REWIND = "expo.modules.sunomediasession.REWIND"
    private const val ACTION_NEXT = "expo.modules.sunomediasession.NEXT"
    private const val ACTION_PREVIOUS = "expo.modules.sunomediasession.PREVIOUS"

    private const val CUSTOM_FORWARD = "forward10"
    private const val CUSTOM_REWIND = "rewind10"

    private const val COMMAND_PLAY = "play"
    private const val COMMAND_PAUSE = "pause"
    private const val COMMAND_STOP = "stop"
    private const val COMMAND_SEEK_TO = "seekTo"
    private const val COMMAND_SKIP = "skip"
    private const val COMMAND_NEXT = "next"
    private const val COMMAND_PREVIOUS = "previous"
  }
}
