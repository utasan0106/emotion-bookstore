/* =============================================================================
 * V3 privacy-safe measurement adapter
 * -----------------------------------------------------------------------------
 * Event names are the complete public measurement payload. Runtime Product code
 * cannot add parameters, user properties, content identity, or URLs here.
 *
 * No GA4 destination is configured in this source snapshot. The default adapter
 * therefore fails closed with MEASUREMENT_CONFIG_BLOCKED and performs no network
 * request. A transport can only be injected into an isolated deterministic test
 * adapter; connecting a verified QA/Production destination is a separate gate.
 * ========================================================================== */
(function (global) {
  'use strict';

  var EVENT_ALLOWLIST = Object.freeze([
    'v3_entrance_view',
    'v3_emotion_select',
    'v3_discovery_view',
    'v3_experience_select',
    'v3_experience_save',
    'v3_external_open',
    'v3_return_view',
    'v3_trace_start',
    'v3_trace_complete',
    'v3_trace_skip',
    'v3_editorial_open',
    'v3_editorial_media_intent',
    'v3_editorial_action'
  ]);

  var PRIVACY_CONFIGURATION = Object.freeze({
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    data_retention_candidate_months: 2,
    user_properties_enabled: false,
    content_parameters_enabled: false
  });

  function isPlainObject(value) {
    return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
  }

  function acceptedEmptyPayload(value) {
    return value === undefined || (isPlainObject(value) && Object.keys(value).length === 0);
  }

  function result(ok, status) {
    return Object.freeze({ ok: ok, status: status });
  }

  function createAdapter(options) {
    options = options || {};
    var deterministicTest = options.deterministicTest === true;
    var transport = deterministicTest && typeof options.transport === 'function'
      ? options.transport : null;
    var seen = Object.create(null);

    function emit(eventName, payload) {
      if (EVENT_ALLOWLIST.indexOf(eventName) === -1) {
        return result(false, 'EVENT_NOT_ALLOWED');
      }
      if (!acceptedEmptyPayload(payload)) {
        return result(false, 'PAYLOAD_NOT_ALLOWED');
      }
      if (!transport) {
        return result(false, 'MEASUREMENT_CONFIG_BLOCKED');
      }
      try {
        transport(eventName, Object.freeze({}));
        return result(true, 'SENT');
      } catch (error) {
        return result(false, 'ANALYTICS_UNAVAILABLE');
      }
    }

    function emitOnce(eventName, dedupeToken, payload) {
      if (typeof dedupeToken !== 'string' || !dedupeToken || dedupeToken.length > 160) {
        return result(false, 'DEDUPE_TOKEN_INVALID');
      }
      if (EVENT_ALLOWLIST.indexOf(eventName) === -1) {
        return result(false, 'EVENT_NOT_ALLOWED');
      }
      if (!acceptedEmptyPayload(payload)) {
        return result(false, 'PAYLOAD_NOT_ALLOWED');
      }
      var key = eventName + '\n' + dedupeToken;
      if (seen[key]) return result(false, 'DUPLICATE_SUPPRESSED');
      /* Mark before transport: failures never trigger an automatic retry loop. */
      seen[key] = true;
      return emit(eventName, payload);
    }

    function emitDurableSave(saveResult, dedupeToken) {
      if (!saveResult || saveResult.ok !== true) {
        return result(false, 'SAVE_NOT_DURABLE');
      }
      return emitOnce('v3_experience_save', dedupeToken, {});
    }

    return Object.freeze({
      emit: emit,
      emitOnce: emitOnce,
      emitDurableSave: emitDurableSave,
      status: function () {
        return transport ? 'DETERMINISTIC_TEST_TRANSPORT' : 'MEASUREMENT_CONFIG_BLOCKED';
      }
    });
  }

  var runtimeAdapter = createAdapter();

  global.V3_ANALYTICS = Object.freeze({
    EVENT_ALLOWLIST: EVENT_ALLOWLIST,
    PRIVACY_CONFIGURATION: PRIVACY_CONFIGURATION,
    MEASUREMENT_DESTINATION_STATUS: 'UNVERIFIED_QA_DESTINATION',
    emit: runtimeAdapter.emit,
    emitOnce: runtimeAdapter.emitOnce,
    emitDurableSave: runtimeAdapter.emitDurableSave,
    status: runtimeAdapter.status,
    createDeterministicTestAdapter: function (transport) {
      return createAdapter({ deterministicTest: true, transport: transport });
    }
  });
})(window);
