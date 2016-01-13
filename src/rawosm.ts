'use strict';

import * as osmtojson from 'osmtogeojson';

export namespace RawOsm {
  /** The basic components of OpenStreetMap's conceptual data model of the physical world. */
  export interface Element {
    id: number;
    user?: string;
    uid?: number;
    timestamp?: Date;
    visible?: boolean;
    version?: number;
    changeset?: number;
    tags?: Tag[];
  }

  /** defining points in space */
  export interface Node extends Element {
    lat: number;
    lon: number;
  }

  /** defining linear features and area boundaries */
  export interface Way extends Element {
    nds: Nd[];
    name?: string;
    area?: boolean;
  }

  export interface Tag {
    key: string;
    value: string;
  }

  export interface Nd {
    ref: number;
  }
}
