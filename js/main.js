(function(){
	
var attrArray = ["HC01_EST_VC01","HC02_EST_VC01","HC03_EST_VC01","HC01_EST_VC03","HC01_EST_VC04","HC01_EST_VC05","HC01_EST_VC06","HC01_EST_VC07","HC01_EST_VC08","HC01_EST_VC09","HC01_EST_VC10","HC01_EST_VC11","HC01_EST_VC12","HC01_EST_VC13","HC01_EST_VC14","HC01_EST_VC15","HC01_EST_VC16","HC01_EST_VC17","HC01_EST_VC18","HC01_EST_VC19","HC01_EST_VC20"]
var expressed = attrArray[0];

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
	 //map frame dimensions
    var width = window.innerWidth * 0.35,
        height = 500;

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
    var promises = [d3.csv("data/acs_trim.csv"),
                    d3.json("data/wi_counties.topojson")
                   ];
    Promise.all(promises).then(callback);
	
	function callback(data){
	  csvData = data[0];
	  wi = data[1];
      //console.log(csvData);
      //console.log(wi);
	  
	  var wiCounties = topojson.feature(wi,wi.objects.cb_2015_wisconsin_county_20m).features;
	  
	  join_csv(csvData,wiCounties);
	  
	  //console.log(wiCounties);
	  
	  var counties = map.selectAll(".counties")
	  		.enter()
	  		.append("path")
	  			.attr("class", "counties")
	  			.attr("d", path);
		
    //create the color scale
      var colorScale = makeColorScale(csvData);
	  
	 //Example 1.3 line 24...add enumeration units to the map
      setEnumerationUnits(wiCounties, map, path, colorScale);
	  
	  //add coordinated visualization to the map
      setChart(csvData.slice(1), colorScale);
    };
	
	function join_csv(csvData,wiCounties){		
		var count = 1;
		for(var i = 1; i<csvData.length; i++){
			var csvRegion = csvData[i];
			var csvKey = csvRegion["GEO.id2"];
			//console.log(csvRegion["GEO.display-label"]);
			
			for( var j = 0; j < wiCounties.length; j++){
				var props = wiCounties[j].properties;
				var key = props.GEOID;
				
				//console.log(props.NAME)
				
				if(csvKey == key){
					//console.log(count);
					count++;
					attrArray.forEach(function(attr){
						var val = parseFloat(csvRegion[attr]);
						props[attr] = val;
					});
				}
			}
		}
	}
	function setEnumerationUnits(wiCounties, map, path, colorScale){
		//add wi counties to map
		var count = 1;
		//console.log(wiCounties);
		//console.log(wiCounties)
		
		var counties = map.selectAll(".counties")
        .data(wiCounties)
        .enter()
        .append("path")
        .attr("class", function(d){
			//console.log(count)
			count++;
            return "counties " + d.properties.GEOID;
        })
        .attr("d", path)
		.style("fill", function(d){
            var val = d.properties[expressed];
            if(val){ return colorScale(d.properties[expressed] );
            }else{ return "#EEE";}
		});
	}
	
	
	//function to create color scale generator
	function makeColorScale(data){
		var colorClasses = [
        "#ffffb2",
        "#fecc5c",
        "#fd8d3c",
        "#f03b20",
        "#bd0026"
		];

		//create color scale generator
		var colorScale = d3.scaleThreshold()
			.range(colorClasses);

		//build array of all values of the expressed attribute
		var domainArray = [];
		for (var i=1; i<data.length; i++){
			var val = parseFloat(data[i][expressed]);
			//console.log(val);
			domainArray.push(val);
		};

		//cluster data using ckmeans clustering algorithm to create natural breaks
		var clusters = ss.ckmeans(domainArray, 5);
		//reset domain array to cluster minimums
		domainArray = clusters.map(function(d){
			return d3.min(d);
		});
		//remove first value from domain array to create class breakpoints
		domainArray.shift();

		//assign array of last 4 cluster minimums as domain
		colorScale.domain(domainArray);

		return colorScale;
	};
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.575,
		chartHeight = 473
		leftPadding = 50,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
		
	//create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([0, chartInnerHeight])
        .domain([1000000, 0]);

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
		
	var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
		
	//set bars for each county
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
		.sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bars " + d["GEO.id2"];
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d){
			//console.log(d[expressed]);
			//console.log(yScale(parseFloat(d[expressed])));
            return chartInnerHeight - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
		//Example 2.5 line 23...end of bars block
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });
		
	//create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 120)
        .attr("y", 80)
        .attr("class", "chartTitle")
        .text("Population per County");
		
	//create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
};

})();