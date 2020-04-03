// this is the JS part of the Jelly UI page...
var _modal = {
	"startDT":null,
	"duration":90,
	"endDT":null,
	"timePassed":0,
	"timeRemaining":0,
	"perPassed":0,
	"progressBar": null,
	"progressMsg": null,
	"debug": false,
};

(function () {
	addLoadEvent(init);

	function init(){
		//defaults
		_modal.startDT = new Date();
		_modal.endDT = new Date(_modal.startDT);
		_modal.endDT.setSeconds(_modal.endDT.getSeconds() + _modal.duration);

		_modal.progressBar = document.getElementById("progressBar");
		_modal.progressMsg = document.getElementById("progressMsg");

		//override defaults
		var expireAt = document.getElementById("expireAt");
		_modal.endDT = (expireAt.value != null) ? new Date(expireAt.value) : _modal.endDT;
		var duration = document.getElementById("duration");
		_modal.duration = (duration.value != null) ? parseInt(duration.value) : _modal.duration;

		_GlobalModalInterval = window.setInterval(main, 1000);
	}
	function main(){
		try {
			//console.log("doc.title = " + window.parent.document.title);
			var current = new Date();

			//_modal.timePassed = (current - _modal.startDT)/1000;

			// check if timer refreshed:
			var localLastActionDateStr = window.localStorage.getItem('last_action');
			if (localLastActionDateStr) {
				var lastClientAction = new Date(localLastActionDateStr);
				if (lastClientAction.getTime() > _modal.startDT) {
					// if lastClientAction is since this modal came up, then cancel modal
					consoleDbg("session cancelled!");
					closeGlideModal();
					clearInterval(_GlobalModalInterval);
					return;
				}
			}

			_modal.timeRemaining = ((_modal.endDT - current)/1000).toFixed(0);
			if (_modal.timeRemaining <= 0){
				_modal.timeRemaining = 0;
				window.parent.document.title=   "Session timed out";
				_modal.progressMsg.innerHTML = "Your session has timed out after no activity.  Click to sign back in.";
				document.getElementById("timedOut").style.display = 'none';
				document.getElementById("relogIn").style.display = 'block';
				document.getElementById("bar").style.display = 'none';
			}
			else {
				window.parent.document.title=  (_modal.timeRemaining) + " sec until timeout";
				_modal.progressMsg.innerHTML = ("Your session will expire in " + _modal.timeRemaining + " second(s)");
			}

			_modal.perPassed =  (100 - ((_modal.timeRemaining/_modal.duration) * 100)  ).toFixed(0);
			_modal.perPassed = (_modal.perPassed > 100) ? 100 : _modal.perPassed;

			if (_modal.progressBar.style != null){
				_modal.progressBar.style.width = _modal.perPassed + '%';
			}
			//_modal.progressBar.innerHTML = _modal.perPassed + "% ";

		}
		catch(ex){
			consoleDbg(ex.message);
		}
		finally{
			if (_modal.timeRemaining == 0){
				clearInterval(_GlobalModalInterval);

			}
		}
	}

	function closeGlideModal() {
		try {
			GlideDialogWindow.get().destroy();
		}catch(err){
			consoleDbg("closeGlideModal ERROR: "+err.message, 'warn');
			var x = document.getElementById('session_activity_warning_closemodal');
			if (x) {
				x.click();
			} else {
				consoleDbg("No 'X' close button found!", 'warn');
			}
		}
	}

	function consoleDbg(message, type) {
		if (_modal && _modal.debug) {
			if (type == 'warn') 
				console.warn("SAW ["+ dbgTime() +"] " + message);
			else
				console.log("SAW ["+ dbgTime() +"] " + message);
		}
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
}());
