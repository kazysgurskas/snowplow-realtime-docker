# Snowplow Realtime Docker

## Composition

All snowplow images are taken from their repository: [snowplow-docker][snowplow-docker]
- [Scala Stream Collector][ssc]
- [Stream Enrich][se]
- [Elasticsearch Loader][es]

Other components:

- [Elasticsearch][elasticsearch] - for storage
- [Kibana][kibana] - for visualization
- [nsq][nsq] - for realtime messaging
- [elasticsearch-head][head] - for interacting with elasticsearch
- [iglu repository][iglu] - for hosting your snowplow schemas
- [Portainer][portainer] - management of your Docker stack

## Usage

- If necessary, put your iglu schemas  into the 'iglu' folder.
- Run ```docker-compose up -d``` to pull and start up all containers.
- Set up a tracker to point to ```DOCKER_HOST:8080```

### Exposed ports:

- Scala stream collector: 8080

- NSQ admin: 4171

- Kibana: 5601

- Elasticsearch head: 9100

- Elasticsearch: 9200

- Iglu repository: 80

- Portainer: 9000

## Example use case

This is useful as a Snowplow Mini alternative, demonstrating the whole Snowplow realtime pipeline stack and allowing instant event visualization in Kibana. Example use case would be debugging Snowplow [Javascript script enrichment][js-enrich] without pushing your script to production or even waiting for the batch pipeline to run to test the results of this enrichment.

1. Add your [JSON enrichment config][js-config] file to the ```config/enrichments``` folder.
2. Add your custom self-describing JSON for the derived contexts into the ```iglu/schemas``` folder.
3. Restart ```stream-enrich``` container either via CLI or Portainer UI.
4. Hit the testing page, that has your tracker set up to stream-collector.
5. View the enrichment results directly in Kibana.

### Debugging

- Loglevels for snowplow compontents can be easily changed via ```environment``` variables passed on runtime in ```docker-compose.yml``` config.
- Printing values to stdout in custom Javascript enrichment can be viewed in docker logs: ```docker logs -f stream-enrich```. 
- Bad events will land in elasticsearch with ```bad``` type. 

[snowplow-docker]: https://github.com/snowplow/snowplow-docker
[js-enrich]: https://github.com/snowplow/snowplow/wiki/JavaScript-script-enrichment
[js-config]: https://github.com/snowplow/snowplow/wiki/JavaScript-script-enrichment#json-configuration-file
[ssc]: https://github.com/snowplow/snowplow/tree/master/2-collectors/scala-stream-collector
[se]: https://github.com/snowplow/snowplow/tree/master/3-enrich/stream-enrich
[es]: https://github.com/snowplow/snowplow-elasticsearch-loader/
[elasticsearch]: https://www.elastic.co/products/elasticsearch
[kibana]: https://www.elastic.co/products/kibana
[nsq]: http://nsq.io/
[head]: https://mobz.github.io/elasticsearch-head/
[iglu]: https://github.com/snowplow/iglu
[portainer]: https://portainer.io/