package expo.modules.sunomediakeys

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SunoMediaKeysModule : Module() {
  private val sink: (String) -> Unit = { key -> sendEvent("onKey", mapOf("key" to key)) }

  override fun definition() = ModuleDefinition {
    Name("SunoMediaKeys")

    Events("onKey")

    OnCreate {
      SunoMediaKeys.sink = sink
    }

    OnDestroy {
      // A reload creates the new module before the old one is destroyed; keep the new sink.
      if (SunoMediaKeys.sink === sink) {
        SunoMediaKeys.sink = null
        SunoMediaKeys.enabled = false
      }
    }

    Function("setEnabled") { enabled: Boolean ->
      SunoMediaKeys.enabled = enabled
    }
  }
}
