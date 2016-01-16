'use strict';

import * as rx from 'rx';
import * as rp from 'request-promise';
import * as xmldom from 'xmldom';
import * as _ from 'lodash';
import {OsmJSON} from 'osmtogeojson';

type Tags = { [key: string]: string };
type OsmElement = OsmJSON.Node|OsmJSON.Way|OsmJSON.Relationship;
type OsmElements = OsmElement[];
const parser: xmldom.DOMParser = new xmldom.DOMParser();
const baseUrl: string = 'https://www.openstreetmap.org/api/0.6';

class ElementNames {
  public static Way: string = 'way';
  public static Node: string = 'node';
}

export function fetchWaySet(id: number): rx.Observable<OsmJSON.OsmJSONObject> {
  'use strict';
  return fetch(id, ElementNames.Way)
    .map(parser.parseFromString.bind(parser))
    .flatMap(convertXmlToOsmJsonObject)
    ;
}

export function fetchWay(id: number): rx.Observable<OsmJSON.Way> {
  'use strict';
  return fetchByType<OsmJSON.Way>(id, ElementNames.Way);
}

export function fetchNode(id: number): rx.Observable<OsmJSON.Node> {
  'use strict';
  return fetchByType<OsmJSON.Node>(id, ElementNames.Node);
}

export function fetch(id: number, type: string): rx.Observable<string> {
  'use strict';
  let url: string = `${baseUrl}/${type}/${id}`;
  return rx.Observable.fromPromise(rp(url));
}

function fetchByType<T>(id: number, type: string): rx.Observable<T> {
  'use strict';
  return fetch(id, type)
    .map(parser.parseFromString.bind(parser))
    .flatMap(convertXmlToOsmJsonObject)
    .map((json: OsmJSON.OsmJSONObject) => json.elements.filter((element: OsmJSON.Element) => element.type === type).pop() as any as T)
    ;
}

export function convertXmlToOsmJsonObject(xml: Document): rx.Observable<OsmJSON.OsmJSONObject> {
  'use strict';
  let wayObservable: rx.Observable<OsmElement> = rx.Observable
    .fromArray(xml.getElementsByTagName(ElementNames.Way))
    .map(parseWay)
    ;
  let nodeObservable: rx.Observable<OsmElement> = rx.Observable
    .fromArray(xml.getElementsByTagName(ElementNames.Node))
    .map(parseNode)
    ;

  return wayObservable
    .concat(nodeObservable)
    .toArray()
    .map((elements: OsmElements) => ({ elements }))
    .flatMap(resolveNodesFromWay)
    ;
}

function parseWay(element: Element): OsmJSON.Way {
  'use strict';
  let way: OsmJSON.Way = {
    type: ElementNames.Way,
    id: getNumberAttribute(element, 'id'),
    nodes: toArray(element.getElementsByTagName('nd')).map((tag: Element) => getNumberAttribute(tag, 'ref')),
  };
  return withElementProperties(way, element);
}

function parseNode(element: Element): OsmJSON.Node {
  'use strict';
  let node: OsmJSON.Node = {
    type: ElementNames.Node,
    id: getNumberAttribute(element, 'id'),
    lat: getNumberAttribute(element, 'lat', false),
    lon: getNumberAttribute(element, 'lon', false),
  };
  return withElementProperties(node, element);
}

function withElementProperties<T extends OsmJSON.Element>(value: T, element: Element): T {
  'use strict';
  value.changeset = getNumberAttribute(element, 'changeset');
  value.timestamp = element.getAttribute('timestamp');
  value.version = getNumberAttribute(element, 'version');
  value.user = element.getAttribute('user');
  value.uid = getNumberAttribute(element, 'uid');
  value.tags = convertTags(element);
  return value;
}

function resolveNodesFromWay(json: OsmJSON.OsmJSONObject): rx.Observable<OsmJSON.OsmJSONObject> {
  'use strict';
  let ids: number[] = _
    .chain(json.elements)
    .filter((element: OsmJSON.Element) => element.type === ElementNames.Way)
    .map((element: OsmJSON.Element) => element as OsmJSON.Way)
    .map((way: OsmJSON.Way) => way.nodes)
    .flatten<number>()
    .filter(_.isNumber)
    .value()
    ;

  return rx.Observable
    .fromArray(ids)
    .flatMap((id: number) => fetchNode(id))
    .toArray()
    .map((nodes: OsmJSON.Node[]) => nodes as OsmElements)
    .map((elements: OsmElements) => elements.concat(json.elements))
    .map((elements: OsmElements) => ({ elements }))
    ;
}

function getNumberAttribute(e: Element, name: string, toInteger: boolean = true): number {
  'use strict';
  let result: number = (toInteger ? parseInt : parseFloat)(e.getAttribute(name), 10);
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
