/**
 * cinejoy-tizenbrew / main.js
 *
 * This file is injected into https://cinejoy.to by TizenBrew.
 * CineJoy's TV interface already renders a D-pad-friendly UI and
 * already listens for arrow keys + Enter, so most navigation works out
 * of the box. This script just fills in the Samsung-remote-specific
 * gaps: registering extra remote buttons with Tizen, wiring the
 * physical Back button to CineJoy's back action (and to app-exit when
 * pressed twice), and mapping the dedicated media keys to the
 * shortcuts CineJoy already understands.
 *
 * Tizen remote key codes reference:
 *   10009 = Back/Return   10252 = MediaPlayPause   415 = MediaPlay
 *   19    = MediaPause    413   = MediaStop         412 = MediaRewind
 *   417   = MediaFastForward
 *   403/404/405/406 = Color keys Red/Green/Yellow/Blue
 */
(function () {
  'use strict';

  var KEYS_TO_REGISTER = [
    'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
    'MediaRewind', 'MediaFastForward',
    'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'
  ];

  // Back (10009) is enabled by default on Tizen TVs and does not need
  // registration; the keys above do.
  function registerTVKeys() {
    try {
      if (window.tizen && tizen.tvinputdevice) {
        KEYS_TO_REGISTER.forEach(function (key) {
          try {
            tizen.tvinputdevice.registerKey(key);
          } catch (e) {
            console.warn('[cinejoy-tizenbrew] could not register key', key, e);
          }
        });
      }
    } catch (e) {
      console.warn('[cinejoy-tizenbrew] TVInputDevice API unavailable', e);
    }
  }

  // Re-dispatch a synthetic keyboard event so CineJoy's own handlers
  // (which listen for standard keyboard shortcuts) pick it up.
  function tapKey(keyCode, key) {
    ['keydown', 'keyup'].forEach(function (type) {
      var evt = new KeyboardEvent(type, {
        key: key,
        code: key,
        bubbles: true,
        cancelable: true
      });

      try {
        Object.defineProperty(evt, 'keyCode', {
          get: function () { return keyCode; }
        });
        Object.defineProperty(evt, 'which', {
          get: function () { return keyCode; }
        });
      } catch (e) {
        /* some engines don't allow this; key/code are usually enough */
      }

      document.dispatchEvent(evt);
    });
  }

  function exitApp() {
    try {
      if (window.tizen && tizen.application) {
        tizen.application.getCurrentApplication().exit();
      }
    } catch (e) {
      console.warn('[cinejoy-tizenbrew] could not exit app', e);
    }
  }

  var lastBackPress = 0;
  var BACK_EXIT_WINDOW_MS = 2000;

  function handleBack() {
    var now = Date.now();

    // First press: let CineJoy navigate back.
    tapKey(8, 'Backspace');

    // Second press within the window: exit the app.
    if (now - lastBackPress < BACK_EXIT_WINDOW_MS) {
      exitApp();
    }

    lastBackPress = now;
  }

  document.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
      case 10009: // Back / Return
        handleBack();
        break;

      case 10252: // MediaPlayPause
      case 415:   // MediaPlay
      case 19:    // MediaPause
        tapKey(32, ' '); // Space = play/pause
        break;

      case 413: // MediaStop
        tapKey(8, 'Backspace');
        break;

      case 412: // MediaRewind
        tapKey(37, 'ArrowLeft'); // seek back
        break;

      case 417: // MediaFastForward
        tapKey(39, 'ArrowRight'); // seek forward
        break;

      case 403: // Red -> toggle captions
        tapKey(67, 'c');
        break;

      default:
        break;
    }
  });

  registerTVKeys();
  console.log('[cinejoy-tizenbrew] remote mapping loaded');
})();
