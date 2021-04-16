function convertToCSV(data){
    if (!data || data.length === 0){
        return;
    }
    var csv = [Object.keys(data[0]).slice(0).join(", ")];
    data.forEach(
        function(item){
            csv.push(
                Object.values(item).map(
                    function(val){
                        return(isNaN(val) ? '"' + val + '"' : val)
                    }
                ).join(", ")
            )
        }
    )
    csv = csv.join("\n");
    return("data:text/csv;chartset=utf-8," + escape(csv));
}

var pal = {
    "blue1": "#893f90",
    "blue2": "#c189bb",
    "blue3": "#a45ea1",
    "blue4": "#a9a6aa",
    "blue5": "#7b3b89",
    "blue6": "#551f65"
  };


function draw_dependent_selectors(chart_id, parent_name, parent_selection, selector_configs,margin2, width2, height2,chart_config,data){
    selector_configs.forEach(function(child, config_index){
        if (Object.keys(child).includes("selector_type_dependency")){
            var dependent_name = Object.keys(child.selector_type_dependency)[0];
            if(parent_name == dependent_name){ var selector_type = child.selector_type_dependency[dependent_name][parent_selection[0]];
                selector_configs[config_index].selector_type = selector_type;
                var child_element = child.element._groups[0][0];
                if(selector_type == "dropdown"){
                    var newItem = document.createElement('select');
                }else if(selector_type == "radio" || selector_type == "checkbox"){
                    var newItem = document.createElement('div');
                }
                child_element.parentNode.replaceChild(newItem,child_element);
                selector_configs[config_index].element = d3.select(newItem);
                child.element = d3.select(newItem);
                selector_configs[config_index].element.on("change", function(d){
                    set_selections(chart_id,selector_configs, config_index,margin2, width2, height2,chart_config,data);
                    var filtered_data = subset_data(data, selector_configs);
                    erase_chart(chart_id);
                    draw_bar_chart(filtered_data, chart_id, margin2, width2, height2, chart_config,selector_configs);
                })
            }
        }
        if(!Array.isArray(child.order)){
            var child_column_name = child.column_name;
            var child_element = child.element;
            var dependent_name = Object.keys(child.order)[0];
            if(!(child.selector_type == "dropdown" || child.selector_type == "checkbox")){
                var selector_type = child.selector_type[dependent_name][parent_selection[0]];
            } else {var selector_type = child.selector_type;}
            if(parent_name == dependent_name){ // Something is dependent on me
                var new_config_order = child.order[dependent_name][parent_selection[0]];
                var new_config_defaults = child.defaults[dependent_name][parent_selection[0]];
                child_element.selectAll("*").remove()
                if(selector_type == "dropdown"){
                    // Draw dropdown
                    child_element
                    .selectAll("option")
                    .data(new_config_order)
                    .enter()
                    .append("option")
                    .text(function (d) { return d; })
                    .attr("value", function (d) { return d; })
                    .attr("selected", function (d) {
                        if(new_config_defaults !== undefined && new_config_defaults.includes(d)){return true}
                    });
                }else if(selector_type == "radio" || selector_type == "checkbox"){
                    // Draw radio/checkbox inputs and labels
                    for(var i = 0; i < new_config_order.length; i++){
                        column_value = new_config_order[i]
                        child_element
                        .append("input")
                        .attr("value", column_value)
                        .attr("id", column_value+"_"+chart_id+"_"+child_column_name+"_radio")
                        .attr("type", selector_type)
                        .attr("name", chart_id+"_"+child_column_name+"_radio")
                        .attr("checked", 
                            (new_config_defaults !== undefined && new_config_defaults.includes(column_value)) ? true : undefined
                        )
                        .attr("dy","0.5em")
                        child_element
                        .append('label')
                        .attr("for", column_value+"_"+chart_id+"_"+child_column_name+"_radio")
                        .text(column_value);
                    };           
                }
                selector_configs[config_index].current_selection = new_config_defaults;
            }
        }
    });
}

function set_selections(chart_id, selector_configs, config_index,margin2, width2, height2,chart_config,data){
    var selector_element = selector_configs[config_index].element;
    var selector_type = selector_configs[config_index].selector_type;
    var column_name = selector_configs[config_index].column_name;
    if(selector_type == "dropdown"){
        var new_selection = [selector_element.property("value")];
    }else if(selector_type == "radio" || selector_type == "checkbox"){
        var new_selection = selector_element.selectAll("input:checked").nodes().map(function(d){return d.value});
    }
    if (new_selection == "Proportion" & selector_configs[config_index].current_selection == "Volume"){
        selector_configs.forEach(function(d){
            if(d.selector_type == "checkbox" || d.selector_type == "radio"){
                if (!Array.isArray(d.order)){
                    var dependent_name = Object.keys(d.order)[0];
                    var result = selector_configs.filter(function(x) { return x.column_name == dependent_name })[0];
                    d.element.selectAll("input")._groups[0].forEach( function(d2) {
                        if (d.defaults[dependent_name][result.current_selection[0]].includes(d2.value)){d2.checked=true} else{d2.checked=false}
                    })
                    var defaults = d.defaults;
                } else {
                    d.element.selectAll("input")._groups[0].forEach( function(d2) {
                        if (d.defaults.includes(d2.value)){d2.checked=true} else{d2.checked=false}
                    })
                    var defaults = d.defaults;
                }
                d.current_selection=defaults
            }
        });
    }
    draw_dependent_selectors(chart_id, column_name, new_selection, selector_configs,margin2, width2, height2,chart_config,data);
    selector_configs[config_index].current_selection = new_selection;
}


function add_selectors(chart_id, data, selector_configs){
    // Select chart node by ID
    var chartNode = d3.select("#" + chart_id);
    // Iterate over config objects
    selector_configs.forEach(function(selector_config, config_index){
        // Grab expected configurations from object
        var column_name = selector_config.column_name;
        var selector_type = selector_config.selector_type;
        if (!Array.isArray(selector_config.order)){
            var dependent_name = Object.keys(selector_config.order)[0];
            var result = selector_configs.filter(function(x) { return x.column_name == dependent_name })[0];
            var config_order = selector_config.order[dependent_name][result.current_selection[0]];
            var config_defaults = selector_config.defaults[dependent_name][result.current_selection[0]];
            if(!(selector_type == "dropdown" || selector_type == "checkbox")){
                var selector_type = selector_type[dependent_name][result.current_selection[0]];
            }
        } else {
            var config_order = selector_config.order;
            var config_defaults = selector_config.defaults
        }

        // Find unique column values from data
        var column_values = d3.map(data, function(d){return(d[column_name])}).keys();
        // Reorder column values if "order" is specified, otherwise set "order"
        if(config_order){
            column_values = config_order.filter(function(item){return column_values.includes(item)});
        }else{
            selector_configs[config_index].order = column_values;
        }
        var controlWrapper = chartNode
            .append("div")
        if(Object.keys(selector_config).includes("control_class")){
            var control_class = selector_config.control_class;
        }else{
            var control_class = "spacing";
        }
        controlWrapper.attr("class", control_class)
        if(Object.keys(selector_config).includes("control_title")){
            controlWrapper.append("h3").attr("class","control-title").text(selector_config.control_title)
        }
        if(Object.keys(selector_config).includes("control_info")){
            controlWrapper.append("span").attr("class","ui-icon ui-icon-info").attr("title",selector_config.control_info)
        }
        if(selector_type == "dropdown"){
            // Draw dropdown
            var dropdown = controlWrapper.append("select");
            dropdown
            .selectAll("option")
            .data(column_values)
            .enter()
            .append("option")
            .text(function (d) { return d; })
            .attr("value", function (d) { return d; })
            .attr("selected", function (d) {
                if(config_defaults !== undefined && config_defaults.includes(d)){return true}
            });
            // Set "element" in parent object for later reference
            selector_configs[config_index].element = dropdown;
            // Set "defaults" as first column value if not set
            if(!config_defaults){
                selector_configs[config_index].defaults = [column_values[0]];
            }
        }else if(selector_type == "radio" || selector_type == "checkbox"){
            // Draw radio/checkbox inputs and labels
            var radio = controlWrapper.append("div");
            for(var i = 0; i < column_values.length; i++){
                column_value = column_values[i]
                var radio_pair = radio.append("nobr");
                radio_pair
                .append("input")
                .attr("value", column_value)
                .attr("id", column_value+"_"+chart_id+"_"+column_name+"_radio")
                .attr("type", selector_type)
                .attr("name", chart_id+"_"+column_name+"_radio")
                .attr("checked", 
                    (config_defaults !== undefined && config_defaults.includes(column_value)) ? true : undefined
                )
                .attr("dy","0.5em")
                radio_pair
                .append('label')
                .attr("for", column_value+"_"+chart_id+"_"+column_name+"_radio")
                .text(column_value);
            };           
            // Set "element" in parent object for later reference
            selector_configs[config_index].element = radio;
            // Set "defaults" as all column values if not set
            if(!config_defaults){
                selector_configs[config_index].defaults = column_values;
            }
        }
        // Set "current_seletion"
        selector_configs[config_index].current_selection = selector_configs[config_index].defaults;
    })
}

function subset_data(data, selector_configs){
    var filtered_data = data;
    // Filter data for each current selection in selector_configs
    selector_configs.forEach(function(selector_config){
        if (!Array.isArray(selector_config.current_selection)){
            var dependent_name = Object.keys(selector_config.order)[0];
            var result = selector_configs.filter(function(x) { return x.column_name == dependent_name })[0];
            filtered_data = filtered_data.filter(function(d){
                return(selector_config.current_selection[dependent_name][result.current_selection[0]].includes(d[selector_config.column_name]))
            })
            filtered_data = filtered_data.slice().sort((a, b) => d3.ascending(a.org_type, b.org_type))
        } else {
            filtered_data = filtered_data.filter(function(d){
                return(selector_config.current_selection.includes(d[selector_config.column_name]))
            })
            filtered_data = filtered_data.slice().sort((a, b) => d3.ascending(a.org_type, b.org_type))
        }
    });
    return(filtered_data);
}

function draw_bar_chart(data, chart_id, margin, width, height,chart_config,selector_configs){
    data.forEach(function(d, d_index){
        data[d_index]["year_org"] = d["org_type"] + "_" + d["year"]
     });

     var data_total = d3.nest().key(function(d){
        return d.year_org; })
    .rollup(function(leaves){
        return d3.sum(leaves, function(d){
            return d.value;
        });
    }).entries(data)
    .map(function(d){
        return { year_org: d.key, total: d.value};
    });
    var result0 = selector_configs.filter(function(x) { return x.column_name == "flow_type" })[0];
    var result1 = selector_configs.filter(function(x) { return x.column_name == "measure" })[0];
    if (typeof result0.current_selection.length == 'undefined'){
        var result0 = result0.current_selection.measure[result1.current_selection[0]]
    } else {
        var result0 = result0.current_selection 
    }
    var result2 = selector_configs.filter(function(x) { return x.column_name == "variable" })[0];
    var data_wide = d3.nest()
     .key(function(d) { return d["year_org"] })
     .rollup(function(d) { 
       return d.reduce(function(prev, curr) {
         prev["year_org"] = curr["year_org"];
         prev[curr["flow_type"]] = curr["value"];
         return prev;
       }, {});
     }).entries(data)
     .map(function(d) { 
        return d.value;
      });
      var index;
      for(index=1;index<data_wide.length;index++){
          if (data_wide[index].year_org.split("_")[0]!=data_wide[index-1].year_org.split("_")[0]){
              const empty_array = Object.assign({}, data_wide[index]);
                for (const property in result0) {
                    empty_array[result0[property]] = "";
                };
              empty_array.year_org=data_wide[index-1].year_org.split("_")[0];
              data_wide.splice(index,0,empty_array); index = index +1}
       };

    var chartNode = d3.select("#" + chart_id);
    var svg = chartNode
        .append("svg")
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
            .attr("style","background-color: white;")
        .append("g")
            .attr("transform","translate(" + margin.left + "," + margin.top + ")");
    var y = d3.scaleLinear()
            .rangeRound([height, 0]);
    var x = d3.scaleBand()
            .rangeRound([0, width])
            .padding(0.1)
            .align(0.4);
    var xAxis = d3.axisBottom(x)
    .tickFormat(function(d){ 
        var split_arr = d.split("_");
        var org_type = split_arr[0];
        var year = split_arr[1];
        if(year=="2019"){
            return(year+"_"+org_type)
        }else{
            return(year)
        }
    }).tickSize(0)
    var z = chart_config.colour_axis_scale;
    var keys = result0;
    x.domain(data_wide.map(function(d) { return d.year_org; }));
    y.domain([0, d3.max(data_total, function(d) { return d.total; })]).nice();

    var y_formatter = chart_config.y_axis_scale.variable[result2["current_selection"]];
    var yAxis = d3.axisLeft().ticks(6).scale(y).tickSize(0).tickSizeInner(-width).tickFormat( function(d) { return y_formatter(d) } );

    svg.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")
          .call(function(t){                
              t.each(function(d){ // for each one
              var self = d3.select(this);
              var s = self.text().split('_');  // get the text and split it
              self.text(''); // clear it out
              self.append("tspan") // insert two tspans
                  .attr("x", 0)
                  .attr("dy","1em")
                  .text(s[0]);
              self.append("tspan")
                  .attr("x", 0)
                  .attr("dy","2em")
                  .text(s[1]);
              })
          });

  svg.append("g")
    .attr("class", "yaxis")
    .call(yAxis);

    var data_wide = d3.stack().keys(keys)(data_wide)
    data_wide.forEach(function(d, d_index){
        d.forEach(function(i){
        i["key"] = data_wide[d_index]["key"]
        })
     });

    var tooltip_formatter = chart_config.tooltip_type.variable[result2["current_selection"]];
    svg.append("g")
      .selectAll("g")
      .data(data_wide)
      .enter().append("g")
        .attr("fill", function(d) { return z(d.key); })
      .selectAll("rect")
      .data(function(d) {return d; })
      .enter().append("rect")
        .attr("x", function(d) {  return x(d.data.year_org); })
        .attr("y", function(d) {   return y(d[1]); })
        .attr("height", function(d) { return y(d[0]) - y(d[1]); })
        .attr("width", x.bandwidth())
      .on("mouseover", function() { tooltip.style("display", null); tooltipBackground.style("display", null); })
      .on("mouseout", function() { tooltip.style("display", "none"); tooltipBackground.style("display", "none"); })
      .on("mousemove", function(d) {
        var xPosition = d3.mouse(this)[0]+5;
        var yPosition = d3.mouse(this)[1];
        tooltip.attr("x", xPosition).attr("y", yPosition);
        tooltip_line0.attr("x", xPosition);
        tooltip_line1.attr("x", xPosition);
        tooltip_line2.attr("x", xPosition);
        tooltip_line0.text(d.key);
        tooltip_line1.text(d.data.year_org.split("_")[1]);
        tooltip_line2.text(tooltip_formatter(d))
        var tooltip_bbox = tooltip.node().getBBox();
          tooltipBackground
          .attr("x",tooltip_bbox.x - 2)
          .attr("y",tooltip_bbox.y - 2)
          .attr("height", tooltip_bbox.height + 4)
          .attr("width", tooltip_bbox.width + 4)
          .style("opacity","0.8"); 
      });
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0-margin.left)
      .attr("x",0 - (height / 1.8))
      .attr("dy", "1em")
      .attr('class','yaxistitle')
      .style("text-anchor", "middle")
      .text(chart_config.y_axis_label["variable"][selector_configs[1]["current_selection"]]);
    var legend = svg.append("g")
        .attr("class", "axis")
        .attr("text-anchor", "start")
        .attr("transform", "translate(" + (5 - margin.left) + ", " + (5 - margin.top) + ")")

    var previous_offset_x = 50;
    var previous_offset_y = 0;
    var element_ruler = d3.select(".element_ruler");
    element_ruler
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
    var element_ruler_text = element_ruler.select("text");
    for(var i=0; i < keys.length; i++){
        var d = keys[i];
        
        var legend_item = legend.append("g")
            .attr("transform", "translate(" + previous_offset_x + ", " + previous_offset_y + ")");

        legend_item.append("rect")
            .attr("x", 0)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", z(d))
      
        legend_item.append("text")
            .attr("x", 19)
            .attr("y", 7)
            .attr("dy", "0.32em")
            .text(d);
        element_ruler_text.text(d);
        element_ruler_text.attr("style",
            "font-size:10px;font-weight:100;font-family:'Averta',sans-serif;"
        )
        var text_ruler_bbox = element_ruler_text.node().getBBox();
        previous_offset_x += text_ruler_bbox.width + 29;
        if(previous_offset_x >= (width - (margin.left + margin.right))){
            previous_offset_x = 0;
            previous_offset_y += 25;
        }
    }
    // Readjust if necessary
    var legend_height = (25 + previous_offset_y);
    chartNode.select("svg").attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom + legend_height))
    svg.attr("transform","translate(" + margin.left + "," + (margin.top + legend_height) + ")");
    legend.attr("transform", "translate(" + (5 - margin.left) + ", " + (5 - margin.top - legend_height) + ")")
    
    var tooltipBackground = svg.append("rect")
        .attr("class","tooltip-bg")
        .attr("fill","white");

    var tooltip = svg.append("text")
        .attr("class", "tooltip")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "1.2em")
        .style("text-anchor", "left")
        .attr("font-size", "12px")
        .attr("font-weight", "normal")
        .style("fill", "#443e42")
        .style("display", "none");

    var tooltip_line0 = tooltip.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.2em");
    var tooltip_line1 = tooltip.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.2em");
    var tooltip_line2 = tooltip.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.2em");
}

function erase_chart(chart_id){
    var svg = d3.select("#" + chart_id).select("svg");
    svg.remove();
}
