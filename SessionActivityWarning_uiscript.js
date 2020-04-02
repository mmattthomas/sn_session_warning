//the modal variable must be exposed in order to kill the modal timer if activity is resumed durring warning
var _GlobalModalInterval = null;

//use a javascript IIFE to protect window events from being destroyed with GlideDialogWindow destroy
(function () {
	//when page is loaded initialize
	addLoadEvent(init);

	/* Settings Guide -------------------------

	secPoll           : number of seconds in between calls to check on session activity. between 5-15 is recommended
	secWarningDuration: how many seconds ahead of session expiration to start to warn user
	minSessionTimeout : session length in minutes - this will be overridden by global property settings if debug is not TRUE
	dialogTitle       : title on warning dialog
	forceLogut        : when true, when timer expires, user will be directed to logoutPage.  
	                    if false, they won't (but normal session expiration will apply)
	logoutPage        : if forceLogout is true, this is the page to redirect to
	loginPage         : login page to avoid starting timer on this page
	debug             : when true, debug information is written to console
	debugForUsers     :
	------------------------------------------*/


	var settings = {
		'secPoll':10,
		"secWarningDuration": 120,
		"minSessionTimeout": 30,
		'dialogTitle':' ',
		'forceLogut': false,
		'logoutPage': 'logout.do',
		'loginPage':'login.do',
		'debug': false,
		'debugForUsers': 'MAT9240,KEF9064'
	};

	var objDialog = null; // represents modal dialog window

	var globals = {
		'initialized': false,
		'now':new Date(),
		'lastClientAction':new Date(),
		'warnAt':null,
		'expireAt':null,
		'objTimer':null,
		'originalTitle':''  // reset title if warning pop-up appears
	};
	//initialize actions (setup timed loop to main)
	function init() {
		try {
			// get server settings
			console.log("SAW - init() called");
			
			if (!globals.initialized) {

				console.log("SAW - making ajax call");
				
				var ga = new GlideAjax('SessionWarningUtils');
				ga.addParam('sysparm_name','getSessionInfo');
				ga.getXMLWait();	
				var sessionInfo = JSON.parse(ga.getAnswer());

				globals.currentUserName = sessionInfo.currentUserName;
				globals.sessionID = sessionInfo.sessionID;
				settings.minSessionTimeout = sessionInfo.minSessionTimeout;
				globals.initialized = true;
			}

			// start/reset the local storage's last action with this event 
			// (which is this UI script loading, when a page loads)
			globals.lastClientAction = new Date();
			window.localStorage.setItem('last_action', globals.lastClientAction);

			if (settings.debug) {
				if (!settings.debugForUsers) {
					consoleDbg("Session Activity Warning (SAW) system - debug TRUE, Not filtered to specific users");
				} else {
					if (settings.debugForUsers.indexOf(globals.currentUserName) > -1) {
						consoleDbg("Session Activity Warning (SAW) system - debug TRUE, Filtered to users - current user MATCHES filter");
					} else {
						consoleDbg("Session Activity Warning (SAW) system - debug TRUE, Filtered to users - current user DOESN'T MATCH filter (aborting SAW)");
						return;
					}
				}
			}
			// debug current information:
			consoleDbg("user=" + globals.currentUserName + "; sessionID=" + globals.sessionID + "; timeout minutes=" + settings.minSessionTimeout);

			if ((window.name !== 'gsft_main') || (window.parent.document.URL.indexOf(settings.loginPage) > -1)) {
				consoleDbg("Prevent timer in this window or on this page.");
				return;
			}

			globals.objTimer = window.setInterval(main, settings.secPoll * 1000);
			main();
			if ((typeof Notification !== 'undefined') && (Notification.permission !== "granted")) {
				Notification.requestPermission();
			}
		}
		catch (exc) {
			console.log("SAW - issue running init().  " + exc.message);
		}
	}	

	/*main is looped on secPoll and checks for:
	Heartbeat should be performed
	Warning dialog opened
	Session Expired	*/
	function main() {
		//console.log("Session Timer: main");

		globals.now = new Date();
		calcEnds();

		if (globals.expireAt.getTime() < globals.now.getTime()) {
			//check for session expired
			//SN uses a shared session between browser tabs.  Forcing logoff will end this session.
			//window.location = "logout.do";
			shutdown();  // kills page events/timers
			if (settings.forceLogut) {
				alert('Your session has expired');
				window.location = settings.logoutPage;
			}

		}
		else if (globals.warnAt.getTime() < globals.now.getTime()) {
			//check if modal should be open on each digest
			if (objDialog == null) {

				//if modal isn't open, open it				
				openWarningModal();
				if ((typeof Notification !== 'undefined') && (Notification.permission === "granted")) {
					notify('A browser tab is about to expire...', 10);
				}
			}
		}
		else {
			// check if session restarted
			if (window.parent.document.title.indexOf("sec until timeout") > -1) {
				window.parent.document.title = globals.originalTitle;				
			}
		}
	}

	function openWarningModal() {
		globals.originalTitle = window.parent.document.title;
		//Set the dialog title
		//Instantiate the dialog
		objDialog = new GlideDialogWindow("session_activity_warning");

		//objDialog = new GlideModal("session_activity_warning");

		objDialog.setTitle(settings.dialogTitle);
		//objDialog.removeCloseDecoration();
		objDialog.setPreference("expireAt", globals.expireAt);
		objDialog.setPreference("duration", settings.secWarningDuration);
		objDialog.setSize('400', '135');
		objDialog.render(); //Open the dialog
	}	

	function notify(msg, secDuration) {
		var options = {
			'body': msg,
			'icon': '/favicon.ico'
		};
		var notification = new Notification('Session Timer Notification', options);
		notification.onclick = function () {
			window.focus();
		};
		setTimeout(function () {
			notification.close();
		}, secDuration * 1000);
	}	

	function calcEnds() {

		var localLastActionDateStr = window.localStorage.getItem('last_action');
		if (localLastActionDateStr) {
			globals.lastClientAction = new Date(localLastActionDateStr);
		}

		var now = new Date();
		var secDiff = (now.getTime() - globals.lastClientAction.getTime()) / 1000;

		consoleDbg("lastAction:" + dbgTime(globals.lastClientAction) + " (" + secDiff + "s)") ;
		globals.expireAt = new Date(globals.lastClientAction.getTime() + (settings.minSessionTimeout * 60000));
		globals.warnAt = new Date(globals.expireAt.getTime() - (settings.secWarningDuration * 1000));

	}
	// debug function if debugging enabled in settings
	function consoleDbg(message) {

		if (!settings || !settings.debug) 
			return;

		console.log("SAW ["+ dbgTime() +"] " + message);
	}

	function dbgTime(someTime) {		
		var dt = someTime || new Date();
		var now = new Date();

		var options = {
			// 			year: 'numeric',
			// 			month: 'numeric',
			// 			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		};

		return dt.toLocaleString('en-us', options);
	}

	function shutdown(){
		clearInterval(globals.objTimer);
		window.onmousemove = null;
		window.onclick = null;
		window.onkeypress = null;		
	}

	//refresh last user input datetime, if dialog is open when user becomes active close dialog and perform heartbeat
	function clientAction() {

		globals.lastClientAction = new Date();		
		window.localStorage.setItem('last_action', globals.lastClientAction);

		if (globals.expireAt != null && globals.expireAt.getTime() < globals.lastClientAction.getTime()){
			//expired, shut it down
			shutdown();
		}
		else if (objDialog != null){
			//if warning dialog is open, close it and refresh session
			window.parent.document.title = globals.originalTitle;
			clearInterval(_GlobalModalInterval);
			objDialog.destroy();
			objDialog = null;
		}
	}

	//monitor browser input events to to indicate user is active
	//window.onmousemove = clientAction;
	window.onclick = clientAction;
	window.onkeypress = clientAction;

}());
