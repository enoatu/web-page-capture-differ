## SETUP

1. Create directory "capture/{result1,result2,result-diff}"

2. For capture and diff, execute this
  >docker-compose run -T --rm capture node capture -w1000 http://example1.com http://example2.com

3. See capture/result-diff
