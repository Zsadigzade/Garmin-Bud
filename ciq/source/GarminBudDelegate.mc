import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

class GarminBudDelegate extends WatchUi.BehaviorDelegate {

    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onTap(clickEvent as WatchUi.ClickEvent) as Boolean {
        var app = Application.getApp() as GarminBudApp;

        if (app.getStatus().equals("ready")) {
            app.nextCard();
            WatchUi.requestUpdate();
        } else if (app.getStatus().equals("error") || app.getStatus().equals("config")) {
            app.fetchSummary();
        }

        return true;
    }

    function onSelect() as Boolean {
        var app = Application.getApp() as GarminBudApp;

        if (app.getStatus().equals("ready")) {
            app.nextCard();
            WatchUi.requestUpdate();
        } else if (app.getStatus().equals("error") || app.getStatus().equals("config")) {
            app.fetchSummary();
        }

        return true;
    }
}
