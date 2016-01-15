'use strict';

import * as rx from 'rx';
import * as rp from 'request-promise';
import * as xmldom from 'xmldom';
import * as _ from 'lodash';
import {OsmJSON} from 'osmtogeojson';

type Tags = { [key: string]: string };
const parser: xmldom.DOMParser = new xmldom.DOMParser();
const baseUrl: string = 'https://www.openstreetmap.org/api/0.6';

class ElementNames {
  public static Way: string = 'way';
}

export function fetchWay(id: number): rx.Observable<OsmJSON.OsmJSONObject> {
  'use strict';
  return fetch(id, ElementNames.Way)
    .map(parser.parseFromString.bind(parser))
    .flatMap(convert);
}

export function fetch(id: number, type: string): rx.Observable<string> {
  'use strict';
  let url: string = `${baseUrl}/${type}/${id}`;
  return rx.Observable.fromPromise(rp(url));
}

export function convert(xml: Document): rx.Observable<OsmJSON.OsmJSONObject> {
  'use strict';
  return rx.Observable
    .fromArray(xml.getElementsByTagName(ElementNames.Way))
    .map((wayNode: Element) => convertWay(wayNode))
    .toArray()
    .map((ways: OsmJSON.Way[]) => ways as (OsmJSON.Node|OsmJSON.Way|OsmJSON.Relationship)[])
    .map<OsmJSON.OsmJSONObject>((elements: (OsmJSON.Node|OsmJSON.Way|OsmJSON.Relationship)[]) => ({ elements }))
  ;
}

export function convertWay(element: Element): OsmJSON.Way {
  'use strict';
  return {
    type: 'way',
    id: getNumberAttribute(element, 'id'),
    nodes: toArray(element.getElementsByTagName('nd')).map(tag => getNumberAttribute(tag, 'ref')),
    changeset: getNumberAttribute(element, 'changeset'),
    timestamp: element.getAttribute('timestamp'),
    version: getNumberAttribute(element, 'version'),
    user: element.getAttribute('user'),
    uid: getNumberAttribute(element, 'uid'),
    tags: convertTags(element),
  };
}

function getNumberAttribute(e: Element, name: string, shouldBeInteger: boolean = true): number {
  'use strict';
  let result: number = (shouldBeInteger ? parseInt : parseFloat)(e.getAttribute(name), 10);
  return isNaN(result) ? undefined : result;
}

function toArray<TNode extends Node>(list: NodeListOf<TNode>): TNode[] {
  'use strict';
  return _.range(list.length).map(i => list[i]);
}

function convertTags(element: Element): Tags {
  'use strict';
  let keyValuePairs: [string, string][] = toArray(element.getElementsByTagName('tag'))
    .map<[string, string]>((tag: Element) => [tag.getAttribute('k'), tag.getAttribute('v')]);

  return _
    .reduce<[string, string], Tags>(
      keyValuePairs,
      (tags: Tags, tuple: [string, string]) => {
        tags[tuple[0]] = tuple[1];
        return tags;
      },
      {}
    );
}
