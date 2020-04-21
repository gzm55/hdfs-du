#!/bin/bash -x

HDFSDU_VERSION=0.1.0

cd service
mvn clean assembly:assembly -DdescriptorId=bin
cd target
unzip hdfsdu-service-${HDFSDU_VERSION}-bin.zip
cd hdfsdu-service-${HDFSDU_VERSION}
pwd
mkdir -p logs
java -Xms2048m -Xmx2048m -cp 'lib/*' \
  com.twitter.hdfsdu.HdfsDu \
    -http_port="$2" \
    -title="$1" \
    -use_glog \
    -use_glog_formatter \
    -log_dir=logs \
    -input_path=../../src/main/resources/com/twitter/hdfsdu/data/example.txt
