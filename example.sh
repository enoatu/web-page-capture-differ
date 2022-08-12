#!/bin/sh

domain1=https://example1.com
#domain2=http://host.docker.internal:41114 for test
domain2=http://example2.com

urllist1=./exampleUrlList.txt

# PC
IFS=$'\n'
for url1 in $(cat $urllist1)
do
  url2=$(echo $url1 | sed -e "s@$domain1@$domain2@g")
  docker-compose run -T --rm capture node capture -w1000 --dirPrefix=pc- $url1 $url2
done

# Mobile
for url1 in $(cat $urllist1)
do
  url2=$(echo $url1 | sed -e "s@$domain1@$domain2@g")
  docker-compose run -T --rm capture node capture -w700 --dirPrefix=mobile- $url1 $url2
done

