window.addEventListener('DOMContentLoaded', (event) => {
	// kick it off
	telem.init();
});

let telem = (function() {
	let init, 
		updateTable, 
		selected = '', 
		teleData, dataPoints,
		teleSock = new WebSocket('ws://localhost:8080/realtime'), // initiate the websocket
		socks = {
			v: false,
			c: false
		},
		sort = 'a',
		sel = document.getElementById('tel-type');


	init = async function() {
		// watch select change
		let ts = document.querySelector('.timestamp'),
			map = {
				pwrv: 'pwr.v',
				pwrc: 'pwr.c'
			};

		// create table off the bat with both data points
		teleData = await getData('pwr.c');
		teleData = teleData.concat(await getData('pwr.v'));
		wsUpdate('both');
		sortData(true); // keep as is
		updateTable();

		// subscribe to both off the bat
		teleSock.onopen = function(e) {
			teleSock.send('subscribe pwr.v');
			teleSock.send('subscribe pwr.c');
		}

		// handle socket data
		teleSock.onmessage = function(e) {
			let point = JSON.parse(e.data);
			teleData.push(point);
			sortData(true); // keep as is
			updateTable();
		}

		// track dropdown changes
		sel.addEventListener('change', async ( ) => {

			// track selected
			selected = sel.value;

			switch(sel.value) {
				case 'pwrv':
				case 'pwrc':
					teleData = await getData(map[sel.value]);
					break;
				case 'both':
					teleData = await getData('pwr.c');
					teleData = teleData.concat(await getData('pwr.v'));
					break;
				default: break;

			}
			wsUpdate(sel.value);
			sortData(true); // keep as is
			updateTable();
		});

		// track timetamp sorting
		ts.addEventListener('click', () => {
			sortData(); // change sort (no true)
			updateTable();
		});
	}

	updateTable = function() {
		let c, r, t;

		t = document.getElementById('teltable');
		if(t) t.parentNode.removeChild(t);
		
		t = document.createElement('table');
		t.id = 'teltable';

		t = buildTable(t);

		document.querySelector(".table-wrap").appendChild(t);

		trackDataPointClick();
	}

	async function dpClick( type ) {
		let selVal = type.replace('.', '');
		sel.value = selVal;
		teleData = await getData(type);
		wsUpdate(type);
		sortData(true); // don't change sort
		updateTable();
	}

	function trackDataPointClick() {
		dataPoints = document.getElementsByClassName('data-point');
		
		for(let i = 0; i < dataPoints.length; i++) {
			dataPoints[i].addEventListener('click', (dp) => {
				dpClick(dp.target.innerText);
			})
		}
	}

	function sortData( skipSort = false ) {
		if(!skipSort) sort = sort == 'd' ? 'a' : 'd';

		teleData.sort((a, b) => {
			return sort == 'd' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
		});
	}

	function lastFifteen() {

		let now = new Date(),
			res = {
				end: now.getTime(),
				start: now.setMinutes(now.getMinutes() - 15)
			};

		return res;

	}

	async function getData( point ) {
		let url = 'http://localhost:8080/history/',
			time = lastFifteen(),
			res;

		url += point + '?start=' + time.start + '&end=' + time.end;


		res = await fetch(url)

		return await res.json();
	}

	function wsUpdate( type ) {
		
		switch(type) {
			case 'pwrv':
			case 'pwr.v':
				console.log('subscribe v')
				// subscribe to v, unsubscribe c if necessary
				if(!socks.v) teleSock.send('subscribe pwr.v');
				if(socks.c) teleSock.send('unsubscribe pwr.c');
				socks.v = true;
				socks.c = false;
				break;
			case 'pwrc':
			case 'pwr.c':
				// subscribe to c, unsubscribe v if necessary
				if(!socks.c) teleSock.send('subscribe pwr.c');
				if(socks.v) teleSock.send('unsubscribe pwr.v');
				socks.c = true;
				socks.v = false;
				break;
			case 'both':
				// subscribe to both!
				teleSock.send('subscribe pwr.c');
				teleSock.send('subscribe pwr.v');
				socks.v = true;
				socks.c = true;
				break;
		}

		console.log('socks', socks);
	}

	function buildTable( table ) {
		let r, c;
		
		for(let d in teleData) {

			r = table.insertRow(0);

			c = r.insertCell(0);
			c.classList.add('data-point');
			c.innerHTML = teleData[d].id;
			c = r.insertCell(1);
			c.innerHTML = new Date(teleData[d].timestamp);
			c.innerHTML = c.innerHTML.split('-')[0]
			c = r.insertCell(2);
			c.innerHTML = teleData[d].value;

		}

		return table;
	}

	return {
		init: init
	}
})();
