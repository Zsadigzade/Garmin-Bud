import Toybox.Application;
import Toybox.Application.Properties;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.WatchUi;

class GarminBudApp extends Application.AppBase {

    private var _summary as Dictionary or Null = null;
    private var _status as String = "idle";
    private var _cardIndex as Number = 0;

    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary or Null) as Void {
    }

    function onStop(state as Dictionary or Null) as Void {
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

    function setStatus(status as String) as Void {
        _status = status;
    }

    function setSummary(data as Dictionary or Null) as Void {
        _summary = data;
    }

    function nextCard() as Void {
        _cardIndex = (_cardIndex + 1) % 5;
    }

    function fetchSummary() as Void {
        var serverUrl = Properties.getValue("ServerUrl");
        var apiKey = Properties.getValue("ApiKey");

        if (serverUrl == null || apiKey == null) {
            setStatus("config");
            WatchUi.requestUpdate();
            return;
        }

        var url = serverUrl as String;
        var key = apiKey as String;

        if (url.length() == 0 || key.length() == 0) {
            setStatus("config");
            WatchUi.requestUpdate();
            return;
        }

        while (url.length() > 0 && url.substring(url.length() - 1, url.length()).equals("/")) {
            url = url.substring(0, url.length() - 1);
        }

        url = url + "/api/watch";

        setStatus("loading");
        WatchUi.requestUpdate();

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
        if (responseCode == 200 && data != null && data instanceof Dictionary) {
            setSummary(data as Dictionary);
            setStatus("ready");
        } else {
            setSummary(null);
            setStatus("error");
        }

        WatchUi.requestUpdate();
    }
}
