(function(){
	
var attrArray = ["Total Population","Age under 5","Age 5-9 years","Age 10-14 years","Age 15-19 years","Age 20-24 years","Age 25-29 years","Age 30-34 years","Age 35-39 years","Age 40-44 years","Age 45-49 years","Age 50-54 years","Age 55-59 years","Age 60-64 years","Age 65-69 years","Age 70-74 years","Age 75-79 years","Age 80-84 years","Age 85 and over"]
var expressed = attrArray[0];

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
var yScale1 = d3.scaleLinear()
    .range([0, chartInnerHeight])
    .domain([1000000, 0]);
	
var yScale2 = d3.scaleLinear()
	.range([0,chartInnerHeight])
	.domain([15,0]);

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
		.translate([width / 2.1, height / 1.5]);
		
	var path = d3.geoPath()
        .projection(projection);

	
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/acs_trim.csv"),
                    d3.json("data/wi_counties.topojson"),
					d3.json("data/states-10m.json")
                   ];
    Promise.all(promises).then(callback);
	
	function callback(data){
	  csvData = data[0];
	  wi = data[1];
	  states = data[2];
      //console.log(csvData);
      //console.log(wi);
	  //console.log(states);
	  
	  var wiCounties = topojson.feature(wi,wi.objects.cb_2015_wisconsin_county_20m).features,
	      states = topojson.feature(states,states.objects.states);
	  
	  join_csv(csvData,wiCounties);
	  
	  console.log(states);
	  
	  var states_back = map.append("path")
            .datum(states)
            .attr("class", "states")
            .attr("d", path);
	  
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
	  
	  createDropdown();
	  
	  d3.select("body")
		.append("div")
		.html("<p>Data was taken from the American Fact Finder census data. Total population is not normalized to provide a base for the percentages per age group available via the drop down.</p>");
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
            return "counties g" + d.properties.GEOID;
        })
        .attr("d", path)
		.style("fill", function(d){
            var val = d.properties[expressed];
            if(val){ return colorScale(d.properties[expressed] );
            }else{ return "#EEE";}
		})
		.on("mouseover", function(d){
            highlight(d.properties);
        })
		.on("mouseout", function(d){
            dehighlight(d.properties);
        })
		.on("mousemove", moveLabel);
		
		var desc = counties.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}')
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
		
		console.log(expressed);

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

	function createDropdown(){
		//add select element
		var dropdown = d3.select("body")
			.append("select")
			.attr("class", "dropdown")
			.on("change", function(){
				changeAttribute(this.value, csvData)
			});

		//add initial option
		var titleOption = dropdown.append("option")
			.attr("class", "titleOption")
			.attr("disabled", "true")
			.text("Select Attribute");

		//add attribute name options
		var attrOptions = dropdown.selectAll("attrOptions")
			.data(attrArray)
			.enter()
			.append("option")
			.attr("value", function(d){ return d })
			.text(function(d){ return d });
	};

	//dropdown change listener handler
	function changeAttribute(attribute, csvData){
    //change the expressed attribute
		expressed = attribute;
		//console.log(expressed);

    //recreate the color scale
		var colorScale = makeColorScale(csvData);

    //recolor enumeration units
		var regions = d3.selectAll(".counties")
			.transition()
			.duration(1000)
			.delay(function (de, i) {
				return i * 3;
			})
			.style("fill", function(d,i){
				var value = d.properties[expressed];
				if(value) {
					return colorScale(value);
				} else {
					return "#ccc";
				}
		});
	
	 var bars = d3.selectAll(".bars")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
		.transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);
		
	 updateChart(bars, csvData.length, colorScale);
    };
	
	function updateChart(bars, n, colorScale){
		console.log("update chart");
		//position bars
		bars.attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
		.transition()
		.duration(50)
		.delay(function (de, i) {
			return i * 3;
		})
        .attr("height", function(d,i){
			//console.log(d[expressed]);
			//console.log(yScale(parseFloat(d[expressed])));
			if(expressed == "Total Population"){
				return chartInnerHeight - yScale1(parseFloat(d[expressed]));
			}else{
				return chartInnerHeight - yScale2(parseFloat(d[expressed]));
			}
        })
        .attr("y", function(d,i){
			if(expressed == "Total Population"){
				return yScale1(parseFloat(d[expressed])) + topBottomPadding;
			}else{
				return yScale2(parseFloat(d[expressed])) + topBottomPadding;
			}
        })
		//Example 2.5 line 23...end of bars block
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });
		
		//create vertical axis generator
		if(expressed == "Total Population"){
			var yAxis = d3.axisLeft()
				.scale(yScale1);
			d3.selectAll(".axis")
				.call(yAxis);
			var chartTitle = d3.select(".chartTitle")
			    .text("" + expressed + " per county");
		}else{
			var yAxis = d3.axisLeft()
				.scale(yScale2);
			d3.selectAll(".axis")
				.call(yAxis);
			var chartTitle = d3.select(".chartTitle")
			    .text("Percentage " + expressed + " per county");
		}
    };
	
	//function to highlight enumeration units and bars
	function highlight(properties){
		var selected = d3.selectAll(".g" + properties["GEOID"])
			.style("stroke", "blue")
			.style("stroke-width", "2");
		setLabel(properties);
	};
	
	//function to reset the element style on mouseout
	function dehighlight(properties){
		var selected = d3.selectAll(".g" + properties["GEOID"])
			.style("stroke", function(){
				return getStyle(this, "stroke")
			})
			.style("stroke-width", function(){
				return getStyle(this, "stroke-width")
			});

		function getStyle(element, styleName){
			var styleText = d3.select(element)
				.select("desc")
				.text();

			var styleObject = JSON.parse(styleText);
			
			d3.select(".infolabel")
				.remove();

			return styleObject[styleName];
		};
	};
	
	//function to create dynamic label
	function setLabel(properties){
		//label content
		if(expressed == "Total Population"){
			var labelAttribute = "<h1>" + properties[expressed] +
			"</h1><b>" + expressed + "</b>";
		}else{
			var labelAttribute = "<h1>" + properties[expressed] +
			"%</h1><b>" + expressed + "</b>";
		}

		//create info label div
		var infolabel = d3.select("body")
			.append("div")
			.attr("class", "infolabel")
			.attr("id", properties.GEOID + "_label")
			.html(labelAttribute);

		var countyName = infolabel.append("div")
			.attr("class", "labelname")
			.html(properties.name);
	};
	
	//function to move info label with mouse
	function moveLabel(){
		//get width of label
		var labelWidth = d3.select(".infolabel")
			.node()
			.getBoundingClientRect()
			.width;

		//use coordinates of mousemove event to set label coordinates
		var x1 = d3.event.clientX + 10,
			y1 = d3.event.clientY - 75,
			x2 = d3.event.clientX - labelWidth - 10,
			y2 = d3.event.clientY + 25;

		//horizontal label coordinate, testing for overflow
		var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
		//vertical label coordinate, testing for overflow
		var y = d3.event.clientY < 75 ? y2 : y1; 

		d3.select(".infolabel")
			.style("left", x + "px")
			.style("top", y + "px");
	};

	//function to create coordinated bar chart
	function setChart(csvData, colorScale){

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
				//console.log(d);
				return "bars g" + d["GEO.id2"];
			})
			.attr("width", chartInnerWidth / csvData.length - 1)
			.on("mouseover", highlight)
			.on("mouseout", dehighlight)
			.on("mousemove", moveLabel);
		
		var desc = bars.append("desc")
			.text('{"stroke": "none", "stroke-width": "0px"}')
				
		updateChart(bars, csvData.length, colorScale);
		
		//create a text element for the chart title
		var chartTitle = chart.append("text")
			.attr("x", 120)
			.attr("y", 80)
			.attr("class", "chartTitle")
			.text("Total Population per County");
			
		//create vertical axis generator
		if(expressed == "Total Population"){
			var yAxis = d3.axisLeft()
				.scale(yScale1);
		}else{
			var yAxis = d3.axisLeft()
				.scale(yScale2);
		}

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

};

})();