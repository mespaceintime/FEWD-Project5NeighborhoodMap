// Global Map and InfoWindow References
var map;
var infoWindow;

// ViewModel in MVVM
function ViewModel () {
	var self = this;
	var place;
	// Search box 
	self.currentLocation = function() {
		var location = $("#location:input").val();
		return location;
	};
	self.currentFilter = ko.observable();
	self.placesList = ko.observableArray([]);
	
    // Map
	var markersArray = [];
	function mapRender() {

		var mapOptions = {
			zoomControl: true,
			zoomControlOptions: {
				style: google.maps.ZoomControlStyle.LARGE,
				position: google.maps.ControlPosition.RIGHT_TOP
			},
			scaleControl: true,
			streetViewControl: true,
			streetViewControlOptions: {
				position: google.maps.ControlPosition.RIGHT_TOP
			},
			panControl: true,
			mapTypeControl: true,
			//http://www.w3schools.com/googleAPI/ref_setmaptypeid.asp
			MapTypeId: google.maps.MapTypeId.TERRAIN
		};

		map = new google.maps.Map(document.getElementById("gMap"), mapOptions);

		var defaultBounds = new google.maps.LatLngBounds(
	    	new google.maps.LatLng(25, -125), 
	    	new google.maps.LatLng(50, -55)
		);
		map.fitBounds(defaultBounds);
		
		// Options
		var listDestinations = (document.getElementById("places"));
		listDestinations.index = 5;
		map.controls[google.maps.ControlPosition.LEFT].push(listDestinations);

		// Nav
		var naviForm = (document.getElementById("navigation"));
		naviForm.index = 1;
		map.controls[google.maps.ControlPosition.LEFT].push(naviForm);

		// Search
		var locName = document.getElementById("location");

		var locData = {
			types: ['(cities)'],
			componentRestrictions: {country: "us"}
		};

		var searchBox = new google.maps.places.SearchBox(locName, locData);

		var placesArray = ko.observableArray([]);

	// Yelp - http://forum.jquery.com/topic/hiding-oauth-secrets-in-jquery, with gratitude to Jim(coldfusionguy).

		function yelpRequest (){
			var auth = {
				consumerKey: "3mVw_1SgwXXaOPQR3_b6nA", 
				consumerSecret: "jvsTuKvAKvzJ9xdPJ0y3ok1M-nw",
				accessToken: "DcC6j7kla3A2B8FbxJCD8i74sg9FOSU3",
				accessTokenSecret: "4tzxE8upq1OdgZ9b5Rv9_sndr2s",
				serviceProvider: { 
				signatureMethod: "HMAC-SHA1"
				}
			};

			var eats = self.currentFilter();
			var near = self.currentLocation();

			var accessor = {
				consumerSecret: auth.consumerSecret,
				tokenSecret: auth.accessTokenSecret
			};

			parameters = [];
			parameters.push(['eat', eats]);
			parameters.push(['location', near]);
			parameters.push(['callback', 'cb']);
			parameters.push(['oauth_consumer_key', auth.consumerKey]);
			parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
			parameters.push(['oauth_token', auth.accessToken]);
			parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

			var message = { 
				'action': 'http://api.yelp.com/v2/search',
				'method': 'GET',
				'parameters': parameters 
			};

			OAuth.setTimestampAndNonce(message);
			OAuth.SignatureMethod.sign(message, accessor);

			var parameterMap = OAuth.getParameterMap(message.parameters);
			parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature);

			// Error handling
			var errorHandler = setTimeout(function(){
				alert("Your request search could not be processed. Please check your internet connection.");
			}, 2000);

			$.ajax({
				'url': message.action,
				'data': parameterMap,
				'cache': true,
				'dataType': 'jsonp',
				'jsonpCallback': 'cb',
				'success': function(data, textStats, XMLHttpRequest) {
					clearTimeout(errorHandler);
					placesArray().push(data.businesses);
				},
				// On completion of the request the function for rendering fires //
				'complete': function () {
				  	var bounds = new google.maps.LatLngBounds();
					var places = placesArray()[0];	
				
				// Maker	
					for (place in placesArray()[0]) {
						insertMarker(places);

						placesArray()[0][place].address = (placesArray()[0][place].location.display_address[0] 
							+ ", " + placesArray()[0][place].location.display_address[2]).toString(); 
				// No image  //

						if (placesArray()[0][place].image_url === undefined) {
							placesArray()[0][place].image_url = "http://placehold.it/5x5";
						}
						self.placesList.push(placesArray()[0][place]);

				
				// Map bounds per markers
						bounds.extend(markersArray[place].position);
						map.fitBounds(bounds);
					}

					
				}
			});
		}

		document.getElementById("nav-btn").addEventListener("click", function() {
			// Clear 
			clearOverlays();
			yelpRequest();
		});

	// Source - http://stackoverflow.com/questions/1544739/gMaps-api-v3-how-to-remove-all-markers
	// IClear previous markers
		function clearOverlays() {
		  for (var i = 0; i < markersArray.length; i++ ) {
		    markersArray[i].setMap(null);
		  }
		  markersArray.length = 0;
		  self.placesList([]);
		  placesArray().length = 0;
		}
	// Error handling
		// var mapErrorHandler = setTimeout(function(){
		// 	alert("Page unavailable.  Lost connection.");
		// }, 2500); */
	 //    google.maps.event.addListener(map, 'new', function() {
	 //    	clearTimeout(mapErrorHandler);
	 //    });
	} 

	google.maps.event.addDomListener(window, 'load', mapRender);

	// infoWindow
	var infoWindow = new google.maps.InfoWindow();
	
	function insertMarker(places){
		
		// Marker
		var marker = new google.maps.Marker({
			id: places[place].id,
			map: map,
			position: new google.maps.LatLng((places[place].location.coordinate.latitude),(places[place].location.coordinate.longitude)),
			title: places[place].name,
			animation: google.maps.Animation.DROP,
		//  Content
			content: "<div style='text-align: center'><b>" +
				places[place].name + "</b></br>" +
				"<img src=" + places[place].image_url + "></br>" +
				places[place].location.display_address[0]});
		markersArray.push(marker);

		// Click event listener
		google.maps.event.addListener(marker, "click", function() {
			infoWindow.setContent(marker.content);
			infoWindow.open(map, this);
			marker.setAnimation(google.maps.Animation.DROP);
		});
	}

	self.listClick = function(place) {
		var marker; 
	// Select marker
		for (marker in markersArray) {
			if (markersArray[marker].id === place.id){
	// Pick from markersArray		
				marker = markersArray[marker];
				// Stop searching upon selection click
				break; 
			}
		}
	// Smooth map transition animation
		map.panTo(marker.position);
		
		var dataPlaces =
				"<div style='text-align: center'><b>" +
				place.name + "</b></br>" +
				"<img src=" + place.image_url + "></br>" +
				place.address +  
				"</div>";
        //https://developers.google.com/maps/documentation/javascript/examples/infowindow-simple
		infoWindow.open(map, marker);
		infoWindow.setContent(dataPlaces);
		marker.setAnimation(google.maps.Animation.DROP);
	};
}
// Apply knockOut bindings
ko.applyBindings(new ViewModel());