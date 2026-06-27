import Toybox.Application;
import Toybox.Application.Properties;
import Toybox.Application.Storage;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.Time;
import Toybox.Timer;
import Toybox.WatchUi;

class GarminBudApp extends Application.AppBase {

    const CARD_COUNT = 7;
    const STORAGE_SUMMARY_KEY = "summary";
    const STORAGE_UPDATED_AT_KEY = "updated_at";
    const STORAGE_CACHED_AT_KEY = "cached_at";
    const FETCH_TIMEOUT_MS = 10000;

    private var _summary as Dictionary or Null = null;
    private var _status as String = "idle";
    private var _cardIndex as Number = 0;
    private var _updatedAt as String or Null = null;
    private var _cachedAt as Number or Null = null;
    private var _fetchTimer as Timer.Timer or Null = null;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary or Null) as Void {
    }

    function onStop(state as Dictionary or Null) as Void {
        stopFetchTimer();
    }

    function getInitialView() {
        return [ new GarminBudView(), new GarminBudDelegate() ];
    }

    function getSummary() as Dictionary or Null {
        return _summary;
    }

    function getStatus() as String {
        return _status;
    }

    function getCardIndex() as Number {
        return _cardIndex;
    }

    function getUpdatedAt() as String or Null {
        return _updatedAt;
    }

    function getCachedAt() as Number or Null {
        return _cachedAt;
    }

    function getCardCount() as Number {
        return CARD_COUNT;
    }

    function setStatus(status as String) as Void {
        _status = status;
    }

    function setSummary(data as Dictionary or Null) as Void {
        _summary = data;
    }

    function setUpdatedAt(updatedAt as String or Null) as Void {
        _updatedAt = updatedAt;
    }

    function setCachedAt(cachedAt as Number or Null) as Void {
        _cachedAt = cachedAt;
    }

    function nextCard() as Void {
        _cardIndex = (_cardIndex + 1) % CARD_COUNT;
    }

    function prevCard() as Void {
        _cardIndex = (_cardIndex + CARD_COUNT - 1) % CARD_COUNT;
    }

    function loadCachedSummary() as Boolean {
        var cached = Storage.getValue(STORAGE_SUMMARY_KEY);
        var cachedUpdatedAt = Storage.getValue(STORAGE_UPDATED_AT_KEY);
        var cachedAt = Storage.getValue(STORAGE_CACHED_AT_KEY);

        if (cached == null || !(cached instanceof Dictionary)) {
            return false;
        }

        setSummary(cached as Dictionary);
        setUpdatedAt(cachedUpdatedAt != null ? cachedUpdatedAt as String : null);
        setCachedAt(cachedAt != null ? cachedAt as Number : null);
        setStatus("stale");
        WatchUi.requestUpdate();
        return true;
    }

    private function persistSummary(data as Dictionary) as Void {
        var updatedAt = data.get("updated_at");
        var now = Time.now().value();
        Storage.setValue(STORAGE_SUMMARY_KEY, data);
        Storage.setValue(STORAGE_CACHED_AT_KEY, now);
        setCachedAt(now);
        if (updatedAt != null) {
            Storage.setValue(STORAGE_UPDATED_AT_KEY, updatedAt as String);
        }
    }

    private function stopFetchTimer() as Void {
        if (_fetchTimer != null) {
            _fetchTimer.stop();
            _fetchTimer = null;
        }
    }

    private function startFetchTimer() as Void {
        stopFetchTimer();
        _fetchTimer = new Timer.Timer();
        _fetchTimer.start(method(:onFetchTimeout), FETCH_TIMEOUT_MS, false);
    }

    function onFetchTimeout() as Void {
        if (!_status.equals("loading")) {
            return;
        }

        if (!loadCachedSummary()) {
            setStatus("error");
            WatchUi.requestUpdate();
        }
    }

    function fetchSummary() as Void {
        var serverUrl = Properties.getValue("ServerUrl");
        var apiKey = Properties.getValue("ApiKey");

        if (serverUrl == null || apiKey == null) {
            if (!loadCachedSummary()) {
                setStatus("config");
                WatchUi.requestUpdate();
            }
            return;
        }

        var url = serverUrl as String;
        var key = apiKey as String;

        if (url.length() == 0 || key.length() == 0) {
            if (!loadCachedSummary()) {
                setStatus("config");
                WatchUi.requestUpdate();
            }
            return;
        }

        while (url.length() > 0 && url.substring(url.length() - 1, url.length()).equals("/")) {
            url = url.substring(0, url.length() - 1);
        }

        var watchPath = "/api/watch";
        if (url.length() >= watchPath.length()) {
            var tail = url.substring(url.length() - watchPath.length(), url.length());
            if (!tail.equals(watchPath)) {
                url = url + watchPath;
            }
        } else {
            url = url + watchPath;
        }

        setStatus("loading");
        WatchUi.requestUpdate();
        startFetchTimer();

        var options = {
            :method => Communications.HTTP_REQUEST_METHOD_GET,
            :headers => {
                "Authorization" => "Bearer " + key,
                "Accept" => Communications.REQUEST_CONTENT_TYPE_JSON
            },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
        };

        Communications.makeWebRequest(url, null, options, method(:onSummaryReceived));
    }

    function onSummaryReceived(responseCode as Number, data as Dictionary or String or Null) as Void {
        stopFetchTimer();

        if (responseCode == 200 && data != null && data instanceof Dictionary) {
            var summary = data as Dictionary;
            setSummary(summary);
            persistSummary(summary);

            var updatedAt = summary.get("updated_at");
            setUpdatedAt(updatedAt != null ? updatedAt as String : null);
            setStatus("ready");
        } else if (!loadCachedSummary()) {
            setSummary(null);
            setUpdatedAt(null);
            setStatus("error");
        }

        WatchUi.requestUpdate();
    }
}
