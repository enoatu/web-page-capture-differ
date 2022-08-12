## What is this?
Capture two websites and compare their images by `puppeteer` And `imagemagick compare`.

## How to use

1. Create directory "capture/{result1,result2,result-diff}"

2. For capture and diff, execute this
    ```
    docker-compose run -T --rm capture node capture -w1000 http://example1.com http://example2.com
    ```

3. See capture/result-diff

## options
- -w or --width: viewport width
- --dirPrefix: prefix of directory (you need create capture/hoge-{result1,result2,result-diff} directories --dirPrefix=hoge)
