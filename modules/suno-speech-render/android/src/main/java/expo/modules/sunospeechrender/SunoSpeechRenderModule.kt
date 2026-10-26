package expo.modules.sunospeechrender

import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SunoSpeechRenderModule : Module() {
  private var renderer: SunoSpeechRenderer? = null

  private fun renderer(): SunoSpeechRenderer =
    renderer ?: SunoSpeechRenderer(appContext.reactContext ?: throw Exceptions.ReactContextLost())
      .also { renderer = it }

  override fun definition() = ModuleDefinition {
    Name("SunoSpeechRender")

    // The story about to play: a running render of another story is stopped first.
    AsyncFunction("renderSpeech") { parts: List<String>, locale: String, promise: Promise ->
      renderer().render(parts, locale, foreground = true, promise = promise)
    }

    // The next story, written while the current one plays.
    Function("prefetchSpeech") { parts: List<String>, locale: String ->
      renderer().render(parts, locale, foreground = false, promise = null)
    }

    Function("cancelSpeechRender") {
      renderer?.cancel()
    }

    OnDestroy {
      renderer?.shutdown()
      renderer = null
    }
  }
}
