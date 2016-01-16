'use strict';

import {fetchWaySet} from './osmJsonFetcher';

fetchWaySet(34211254)
  .map(xml => JSON.stringify(xml, null, 2))
  .subscribe(item => console.log(item));
