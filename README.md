## Changes from vanilla HDFS-DU
This repo includes changes from the original HDFS-DU project to better tailor it to suit eBay's needs. The major changes are:
 - Replaced filetree visualization with table (because it was buggy and scaled poorly)
 - Implemented search function allowing users to jump to arbitrary nodes by specifying path
 - Many, many tweaks to the treemap visualization to make it less vulnerable to breaking. 

Plus some minor things like adding command line arguments to specify a title and port. In a perfect world, there are a few more things that could be worked out going forward:
- Highlighting table nodes should highlight them in the tree map (this is surprisingly difficult)
- Smoother searching without the loading animation (also surprisingly difficult, because the treemap visualization lacks any kind of support for jumping to arbitrary nodes)
- Why is the "Up one level" button black? Something's marking it as selected, I believe...


# HDFS-DU [![Build Status](https://secure.travis-ci.org/twitter/hdfs-du.png)](http://travis-ci.org/twitter/hdfs-du)

![hdfsdu UI screenshot](https://github.com/twitter/hdfs-du/raw/master/docs/img/v1.png)

HDFS-DU is an interactive visualization of the Hadoop distributed file system. The project aims to monitor different snapshots for the entire HDFS system in an interactive way, showing the size of the folders, the rate at which the size increases / decreases, and to highlight inefficient file storage.

HDFS-DU provides the following in a web UI:

* A tree-map visualization where each node is a folder in HDFS. The area of each node can be relative to the size or number of descendants.
* A file-tree visualization showing the topology of the file system.

HDFS-DU is built using the following front-end technologies:

* [D3.js](http://d3js.org) - For file-tree visualization
* [JavaScript InfoVis Toolkit](http://thejit.org/) - For tree-map visualization

Follow [@hdfsdu](https://twitter.com/hdfsdu) on Twitter to stay in touch!

## Examples

Below is a screenshot of the HDFS-DU UI. The UI is made up of two linked visualizations. The left visualization is a tree-map which shows parent-child relationships through containment. The right visualization is a file-tree, which displays two levels of depth from the current selected node in the file system. The file-tree visualization displays extra information for each node on hover.

![hdfsdu UI screenshot](https://github.com/twitter/hdfs-du/raw/master/docs/img/1.png)

You can drill down clicking on nodes in either the tree-map or the file-tree.

There are two possible layouts for the tree-map. In the first layout the area of a node is proportional to the total file size of its descendants. In the second layout the area of a node is proportional to the count of its descendants. 

To compute the color of a node, its size, including all its descendants, is divided by the number of those descendants.  The color is assigned using this value such that a lighter color means more files for a given size.   This helps to highlight inefficient nodes which contain too many small files.

![hdfsdu UI screenshot](https://github.com/twitter/hdfs-du/raw/master/docs/img/2.png)

## Quickstart

To get started with hdfs-du, first clone the hdfs-du GitHub repository:

```
git clone https://github.com/twitter/hdfs-du.git
cd hdfs-du
```

Next, you can try running the hdfs-du demo on your local machine. The demo
starts a local web server which serves the front-end client resources and sample
data. Start the demo with the following command and then browse to
[http://localhost:20000/index.html](http://localhost:20000/index.html):

```
./demo.sh
```

## Running HDFS-DU with your own data

To visualize your own cluster, you need to generate an HDFS-DU data set. Currently this is a
multi-step process:

* Export the HDFS fsimage file for offline processing with the
  [Offline Image Viewer](http://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsImageViewer.html)
* Process the fsimage export with [Pig](http://pig.apache.org).
* Post-process the pig data set.

Simplifying this process is certainly possible (hey, it was hack week :)

First, SSH to your secondary name node, dump the fsimage in delimited format, and copy to HDFS.

```
hadoop oiv -i /path/to/current/fsimage -o fsimage-delimited.tsv -p Delimited
hadoop fs -copyFromLocal fsimage-delimited.tsv .
```

Now let's process fsimage export. Uncomment the `register` statement in
`pig/src/test/resources/hdfsdu.pig`, build the UDF, and run Pig to process the fsimage export.

```
cd /path/to/hdfs-du/pig
mvn package
pig -param INPUT=fsimage-delimited.tsv -param OUTPUT=hdfsdu.out pig/src/test/resources/hdfsdu.pig
```

Lastly we need to copy the dataset local and perform a quick post-processing step.

```
hadoop fs -getmerge hdfsdu.out .
python src/main/python/leaf.py hdfsdu.out/hdfsdu.out > hdfsdu.data
```

Now we're ready to start HDFS-DU!

```
./start.sh /path/to/hdfsdu.data
```

Point your web browser to [http://localhost:20000](http://localhost:20000) and see what your
cluster looks like.

## How to contribute

Bug fixes, features, and documentation improvements are welcome! Please fork the project and send us
a pull request on GitHub. You can [submit issues on Github](https://github.com/twitter/hdfs-du/issues)
as well.

Here are some high-level goals we'd love to see contributions for:

* Improve the front-end client
* Create a new back-end for a different runtime environment

## Authors

* Travis Crawford ([@tc](https://twitter.com/tc/))
* Nicolas Garcia Belmonte ([@philogb](https://twitter.com/philogb))
* Robert Harris ([@trebor](https://twitter.com/trebor))

## License

Copyright 2012 Twitter, Inc.

Licensed under the Apache License, Version 2.0: http://www.apache.org/licenses/LICENSE-2.0

