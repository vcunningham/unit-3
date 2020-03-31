//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
	 //map frame dimensions
    var width = 800,
        height = 800;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);
		
	var projection = d3.geoAlbers()
		.center([0.00, 31.78])
		.rotate([90.09, -11.82, 0])
		.parallels([45.00, 90.00])
		.scale(4114.14)
		.translate([width / 2, height / 2]);
		
	var path = d3.geoPath()
        .projection(projection);

	
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/acs.csv"),
                    d3.json("data/wi_counties.topojson")
                   ];
    Promise.all(promises).then(callback);
	
	function callback(data){
	  csvData = data[0];
	  wi = data[1];
      console.log(csvData);
      console.log(wi);
	  
	  var wiCounties = topojson.feature(wi,wi.objects.cb_2015_wisconsin_county_20m);
	  
	  console.log(wiCounties);
	  
	  var counties = map.append("path")
        .datum(wiCounties)
        .attr("class", "counties")
        .attr("d", path);
    };
};