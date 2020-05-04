/*
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



 //There's something overriding $ in this file, so uses of jQuery need to specify "jQuery"


 var publicTM;

(function() {

var queryLimit = 50000,
	maxFolders = 70e6,
	maxSize = 70e8,
	sizeThreshold = 150 * (1 << 20), //150 M Bytes
	depth = 1;

var $ = function(d) { return document.getElementById(d); },
	$$ = function(d) { return document.querySelectorAll(d); };

function FileTreeMap(chart_id, current_path) {
	var that = this,
		size = $('size'),
		count = $('count'),
//		tm = new $jit.TM.Voronoi({
		tm = new $jit.TM.Squarified({
	    injectInto: chart_id,
	    titleHeight: 15,
//	    titleHeight: 0,
	    levelsToShow: depth,
//	    labelsToShow: [0, 1],
	    animate: true,
	    offset: 1,
	    duration: 1000,
	    hideLabels: true,
	    Label: {
	    	type: 'HTML',
//	    	type: 'Native',//'HTML',
//	    	size: 1,
//	    	color: 'white'
	    },
	    Events: {
	      enable: true,
	      onClick: function(node) {
	        if(node) {
	        	Observer.fireEvent('click', node);
	        }
	      },
	      onRightClick: function() {
	    	if (tm.clickedNode && tm.clickedNode.getParents().length) {
	    		Observer.fireEvent('back', tm.clickedNode);
	    	}
	      }
	    },
	    onCreateLabel: function(domElement, node){
	        domElement.innerHTML = node.name;

	      domElement.onmouseover = function(event) {
	    		Observer.fireEvent('mouseover', node);
        };
	      domElement.onmouseout = function(event) {
	    		Observer.fireEvent('mouseout', node);
        };
	    },
	    Tips: {
	      enable: true,
	      offsetX: 20,
	      offsetY: 20,
	      onShow: function(tip, node, isLeaf, domElement) {
	          var html = "<div class=\"tip-title\">" + node.name
			+ "</div><div class=\"tip-text\"><ul><li>";
				var data = node.data;
				html += "<b>folder size:</b> " + Math.round(data.fileSize / (1 << 20)) + " MB</li><li>";
				html += "<b>n. of descendants:</b> " + data.nChildren + "</li><li>";
				html += "<b>avg. file size:</b> " + Math.round((data.nChildren <= 0 ? 0 : data.fileSize / data.nChildren) / (1 << 20)) + " MB</li></ul></div>";
				tip.innerHTML = html;
	      }
	    },

	    request: function(nodeId, level, callback){
	    	//Apparently there are some things I'm not understanding here, but this is not _always_ called. It seems to
	    	//sometimes not be called when we're running the production script with production data, anyway
	    	if (level <= depth -1) {
	    		callback.onComplete(nodeId, { children: [] });
	    		return;
	    	}
	    	new XHR({
	    		url: '/tree_size_by_path',
	    		params: {
	    			path: nodeId,
	    			limit: queryLimit / level,
	    			depth: level
	    		},
	    		onSuccess: function(text) {
	    			var json = JSON.parse(text);
	    			json = treemap.processJSON(json);
	    			json.id = nodeId;
	    			treemap.graphChildren(json);
	    			callback.onComplete(nodeId, json);
	    		}
	    	}).send();
	    }
	  });

	  this.tm = tm;
	  this.bc = $('breadcrumb');
	  this.currentNodeID = current_path;
	  this.updateHash = false;
	  this.busyDuration = 1200;

	  var loading_chart = jQuery('#'+chart_id).children().first().clone().prop({id: "treemap-loading"}).css({'display':'none'});
	  jQuery('#'+chart_id).append(loading_chart);
	  loading_chart.append("<img src='loading.gif' style='width:100%; height:100%'>");


	  $('back').addEventListener('click', function() {
		  if (tm.clickedNode) Observer.fireEvent('back', tm.clickedNode)
		  else Observer.fireEvent('back', treemap.getCurrentNode())
	  });
	  $('search_button').addEventListener('click', function() {
	  	  treemap.searchButton();
	  });
	  $('search_input').addEventListener('keypress', function(event){
	  	if (event.which == 13 || event.keyCode == 13){
	  	  treemap.searchButton();
	  	}
	  });
	  size.addEventListener('click', function(e) {
	  	  if (that.searchLock) return;
		  size.classList.add('selected');
		  count.classList.remove('selected');
		  that.setSize();
	  });
	  count.addEventListener('click', function(e) {
	  	  if (that.searchLock) return;
		  count.classList.add('selected');
		  size.classList.remove('selected');
		  that.setCount();
	  });
}

FileTreeMap.prototype = {
	size: true,

	scale: new chroma.ColorScale({
//	    colors: ['#6A000B', '#F7E1C5']
//		colors: ['#A50026', '#D73027', '#F46D43', '#FDAE61', '#FEE090', '#FFFFBF', '#E0F3F8', '#ABD9E9', '#74ADD1', '#4575B4', '#313695']
//		colors: ['#67001F', '#B2182B', '#D6604D', '#F4A582', '#FDDBC7', '#F7F7F7', '#D1E5F0', '#92C5DE', '#4393C3', '#2166AC', '#053061']
//		colors: ['#CA0020', '#F4A582', '#F7F7F7', '#92C5DE', '#0571B0'],
		colors: ['#FFF7FB', '#ECE7F2', '#D0D1E6', '#A6BDDB', '#74A9CF', '#3690C0', '#0570B0', '#045A8D', '#023858']
//		limits: chroma.limits([0, 0.2, 0.4, 0.6, 0.8, 1], 'equal', 5)
	}),

	searchButton: function(){
	  if (this.busy || this.searchLock) return;
  	  var si = jQuery('#search_input');
  	  var directory = si.val();
  	  if (directory == '') return; //Otherwise empty searches will take us back to root
 	  si.data('lastSearch', directory);
  	  //We can't really correct bad directories, but we can help with common formatting gotchas
	  directory = jQuery.trim(directory).replace(/(^\/+)|(\/+$)/g, '');
	  directory = '/'+directory;
	  si.val(''); //Set this back to the directory if search fails?
	  Observer.fireEvent('search', directory);
	},

	searchError: function(message){
		jQuery('#search_error').text(message);
	},

	color: function(data) {
		var ratio = (data.nChildren <= 0 ? 0 : data.fileSize / data.nChildren) / sizeThreshold;
		if (ratio > 1) {
			return this.scale.getColor(1).hex();
		} else {
			return this.scale.getColor(ratio).hex();
		}
	},

	toBytes: function(bytes) {
	   if(bytes == 0) return '0 Byte';
	   var k = 1024;
	   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	   var i = Math.floor(Math.log(bytes) / Math.log(k));
	   return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
	},

	load: function(json) {
		this.tm.loadJSON(json);
		this.tm.refresh();
	},

	getCurrentNode: function() {
		return this.tm.graph.getNode(this.currentNodeID);
	},

	processJSON: function(json) {
		if (!json.id) {
			return json;
		}

		var fileSize = json.data.fileSize,
			min = Math.min,
			len = fileSize.length,
			smallNums = len > 9,
			decimals = 6,
			that = this,
			count = 0, div;

		div = 350 / (this.size ? maxFolders : maxSize);

		$jit.json.each(json, function(n) {
			var fileSizeText = n.data.fileSize,
				nChildren = n.data.nChildren,
				len = fileSizeText.length,
				size;
			//cut the file size
			if (smallNums) {
				fileSizeText = fileSizeText.slice(0, len - decimals) + '.' + fileSizeText.slice(len-decimals);
			}
			size = parseFloat(fileSizeText);
			n.data.$area = that.size ? (size || 1) : +nChildren;
			n.data.$color = that.color(n.data);
		});
		return json;
	},

	setVoronoi: function() {
		var tm = this.tm,
			util = $jit.util;
		util.extend(tm, new $jit.Layouts.TM.Voronoi());
		tm.config.Node.type = 'polygon';
		tm.config.Label.textBaseline = 'middle';
		tm.config.labelsToShow = [1, 1],
		tm.config.animate = false;
		tm.refresh();
		tm.config.animate = true;
	},

	setSquarified: function() {
		var tm = this.tm,
			util = $jit.util,
			$C = $jit.Complex,
			dist2 = $jit.geometry.dist2;

		util.extend(tm, new $jit.Layouts.TM.Squarified());
		tm.config.Node.type = 'rectangle';
		tm.config.Label.textBaseline = 'top';
		tm.config.labelsToShow = false,
		tm.config.animate = false;
		tm.refresh();
		tm.config.animate = true;
	},

	setSize: function() {
		if (this.size || this.busy) return;
		this.size = this.busy = true;

		var that = this,
			util = $jit.util,
			min = Math.min,
			tm = this.tm,
			g = tm.graph;

		g.eachNode(function(n) {
			n.setData('area', +that.parseFileSize(n.data.fileSize, 6), 'end');
		})

		tm.compute('end');
		tm.fx.animate({
			modes: {
				'position': 'linear',
				'node-property': ['width', 'height']
			},
			duration: 1000,
			fps: 60,
			onComplete: function() {
				g.eachNode(function(n) {
					n.setData('area', n.getData('area', 'end'));
				});
				that.busy = false;
			}
		});
	},

	setCount: function() {
		if (!this.size || this.busy) return;
		this.size = false;
		this.busy = true;

		var that = this,
			util = $jit.util,
			min = Math.min,
			tm = this.tm,
			g = tm.graph;

		g.eachNode(function(n) {
			n.setData('area', +n.data.nChildren, 'end');
		})

		tm.compute('end');
		tm.fx.animate({
			modes: {
				'position': 'linear',
				'node-property': ['width', 'height']
			},
			fps: 60,
			duration: 1000,
			onComplete: function() {
				g.eachNode(function(n) {
					n.setData('area', n.getData('area', 'end'));
				});
				that.busy = false;
			}
		});
	},

	updateWindowHash: function() {
		var currHash = window.location.hash.substring(1);
		var currPath = this.currentNodeID;
		if (currHash == currPath || (currHash == '' && currPath == '/')) {
			return;
		}

		this.updateHash = true;
		window.location.hash = currPath;;
	},

	updateHTML: function(node_id) {
		if (!node_id || '/' == node_id) {
			this.bc.innerHTML = '/';
		} else {
			this.bc.innerHTML = '/' + node_id.replace(/\//g, ' &rsaquo; ');
		}

		this.updateGraph();
	},

	updateGraph: function(nodes){
		var that = this;
		list = document.querySelectorAll(".temp");
		for(var i = 0; i < list.length; ++i){
			list[i].parentNode.removeChild(list[i])
		}
		var table = document.getElementById('data');
		var counter = 1;
		var currentNodeID = this.currentNodeID;
		jQuery('#table_breadcrumb').text(currentNodeID);
		if (currentNodeID!='/') var re = new RegExp("^"+currentNodeID+'/'+"[^\/]+$");
		else var re = new RegExp("^"+currentNodeID+"[^\/]+$");
		var nodeArray = [];
		if (!nodes){
			this.tm.graph.eachNode(function(n){

				if (n.id.match(re) || n.id == currentNodeID){
					nodeArray.push(n)
				}

			});
		} else {
			for (var i = 0; i < nodes.length; i++){
				var n = nodes[i];
				if (n.id.match(re) || n.id == currentNodeID){
					nodeArray.push(n)
				}

			}
		}
		nodeArray.sort(function(a, b){
			var aData = parseInt(a.data.fileSize);
			var bData = parseInt(b.data.fileSize);
			if (aData > bData) return -1;
			if (aData < bData) return 1;
			return 0;
		});
		for (var i = 0; i < nodeArray.length; i++){
				var n = nodeArray[i];
				var r = table.insertRow(counter);
				counter = counter+1;
				var color = that.color(n.data);
				r.className = "temp";
				r.id = "table-"+n.id;
				if (n.id==that.currentNodeID) name = "("+n.id+")";
				else name = n.id.substring(that.currentNodeID.length);
				r.insertCell(0).innerHTML = '<div class="tree-square" style="background-color: '+color+';"></div>'
				r.insertCell(1).innerHTML = '<a id="table-link-'+n.id+'"class="tree-row" href="/" onclick="Observer.fireEvent(\'search\',\''+n.id+'\'); return false;">'+name+'</a>';
				r.insertCell(2).innerHTML = that.toBytes(n.data.fileSize);
				r.insertCell(3).innerHTML = n.data.nChildren;
				r.insertCell(4).innerHTML = that.toBytes(n.data.nChildren <= 0 ? 0 : n.data.fileSize / n.data.nChildren); //Average file size
		}
	},

	graphChildren: function(node){
		//The important case is the one where the current node is the fetched node,
		//because this means that we're fetching a new node and the graph should be
		//it plus its children.
		var that = this;
		if(this.currentNodeID!=node.id) return;
		var nodes = [];
		setTimeout(function(n){
		for (var i = 0; i < node.children.length; i++){
			var n = that.tm.graph.getNode(node.children[i].id);
			nodes.push(n);
		}
		nodes.push(node);
		that.updateGraph(nodes)}, this.busyDuration/2);
	},

	parseFileSize: function(size, decimals) {
		var len = size.length;
		return size.slice(0, len - decimals) + '.' + size.slice(len-decimals);
	},

	setSearchLock: function() {
		this.pendingSearchLock = true;
		this.searchLock = true;
		jQuery("#treemap-canvaswidget").hide()
		jQuery("#treemap-loading").show();
	},

	clearSearchLock: function() {
		this.searchLock = false;
		jQuery("#treemap-loading").hide()
		jQuery("#treemap-canvaswidget").show();
		this.tm.refresh();
	},

	checkSearchLock: function() {
		if (!this.pendingSearchLock) return;
		this.pendingSearchLock = false;
		var that = this;
		setTimeout(function(){that.clearSearchLock();}, 2000);
	},

	setBusy: function(duration){
		this.busy = true;
		var that = this;
		setTimeout(function(){that.busy = false;}, duration);
	},

	seek: function(nodeElem) {
		if(!nodeElem){
			this.missingNodeHandler();
			return;
		}

		var tm = this.tm,
			node = tm.graph.getNode(nodeElem.id),
			currentNode = this.getCurrentNode();


		if (node.isDescendantOf(currentNode.id)){
			this.descendHandler(node);
		} else if (currentNode.isDescendantOf(node.id)){
			this.backHandler();
		} else if (node.id != currentNode.id){
			this.searchHandler(node);
		}

	},

	missingNodeHandler: function(){
		var nodeName = this.lastSearch;
		var si = jQuery('#search_input');
		//The lastSearch stored in data is before the cleanup that happens, so we have to modify it slightly and then compare
		var modifiedLastSearch = jQuery.trim(si.data('lastSearch')).replace(/(^\/+)|(\/+$)/g, '');
	    modifiedLastSearch = '/'+modifiedLastSearch;
		if (modifiedLastSearch == this.lastSearch) {
			si.val(si.data('lastSearch'));
		}
		this.searchError('Could not find directory: '+si.data('lastSearch'));

	},

	searchHandler: function(node) {
		if (this.busy) return;
		var tm = this.tm;
		this.searchError(''); //Clear any search errors
		this.setBusy(this.busyDuration+2500); //2500 = searchLock time + 500 more as below
		this.setSearchLock();
		//This is much much less elegant than checking the searchlock when we retrieve data, but
		//we apparently don't always retrieve data, so this is the easiest best option
		setTimeout(function(){
			treemap.checkSearchLock();
		}, 500)

		this.currentNodeID = node.id;
		this.updateWindowHash();
		tm.enter(node);
		this.updateHTML(this.currentNodeID);
	},


	descendHandler: function(node) {
		if (this.busy) return;
		var tm = this.tm;
		this.searchError(''); //Clear any search errors
		this.setBusy(this.busyDuration);

		this.currentNodeID = node.id;
		this.updateWindowHash();
		tm.enter(node);
		this.updateHTML(this.currentNodeID);
	},

	backHandler: function() {
		if (this.busy) return;
		var tm = this.tm;
		this.searchError(''); //Clear any search errors

		if (this.currentNodeID == '/') return;

		this.setBusy(this.busyDuration);

		var parent = this.getCurrentNode().getParents()[0];
		if (parent) {
			tm.out();
			this.currentNodeID = parent.id;
			this.updateWindowHash();
			this.updateHTML(this.currentNodeID);
		} else {
			var parentId = this.currentNodeID.replace(/\/[^/]*$/g, '');
			if (!parentId) {
				parentId = '/'
			}
			var currDepth = this.currentNodeID.split('/').length;
			this.currentNodeID = parentId;
			this.updateWindowHash();
			new XHR({
				url: '/tree_size_by_path',
				params: {
					path: parentId,
					limit: 50000,
					depth: currDepth
				},
				onSuccess: function(text) {
					var json = JSON.parse(text);
					json = treemap.processJSON(json);
					treemap.load(json);
					treemap.updateHTML(treemap.currentNodeID);
				}
			}).send();
		}
	}
};

var treemap;


Observer.addEvent('load', function(current_path) {
	treemap = new FileTreeMap('treemap', current_path);
	publicTM = treemap;
});

Observer.addEvent('initdataloaded', function (text) {
	var json = JSON.parse(text);
	json = treemap.processJSON(json);
	treemap.load(json);
	treemap.updateHTML(treemap.currentNodeID);
	setTimeout(function(){
		parent.postMessage('hdfs_du loaded', '*');
	}, 1200);
});

Observer.addEvent('click', function (node) {
	if (treemap.searchLock) return;
	treemap.seek(node);
});

Observer.addEvent('back', function (node) {
	if (treemap.searchLock) return;
	treemap.backHandler();
});

Observer.addEvent('search', function (node) {
	if (treemap.searchLock) return;
	treemap.lastSearch = node;
	treemap.seek(treemap.tm.graph.getNode(node));
});

Observer.addEvent('hashchange', function (node) {
	if (treemap.updateHash) {
		treemap.updateHash = false;
		return;
	}
	if (treemap.searchLock) return;
	if (node.charAt(0) != "/") {
		treemap.missingNodeHandler();
		return;
	}
	var treeNode = treemap.tm.graph.getNode(node);
	if (treeNode) {
		treemap.seek(treeNode);
		treemap.updateHash = false;
	} else {
		var depth = node.split('/').length;
		treemap.currentNodeID = node;
		new XHR({
			url: '/tree_size_by_path',
			params: {
				path: node,
				limit: 50000,
				depth: depth + 1
			},
			onSuccess: function(text) {
				var json = JSON.parse(text);
				json = treemap.processJSON(json);
				treemap.load(json);
				treemap.updateHTML(treemap.currentNodeID);
			}
		}).send();
	}
});


// //jQuery selectors don't like the slashes in node ids, so we do it this way
// Observer.addEvent('mouseover', function(node) {
// 	jQuery(document.getElementById('table-link-'+node.id)).css({'border-color':'red'})
// });

// Observer.addEvent('mouseout', function(node) {
// 	jQuery(document.getElementById('table-link-'+node.id)).css({'border-color':''})
// });

})();
