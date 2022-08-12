## What is this?
Capture two websites and compare their images by `puppeteer` And `imagemagick compare`.

## How to use

1. For capture and check difference, execute this
    ```
    docker-compose run -T --rm capture node capture http://example1.com http://example2.com
    ```

3. See diff image in result/diff directory
- Red Color is difference

## options
- -w or --width: viewport width
- --dirPrefix: prefix of result directory
