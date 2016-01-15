'use strict';

import {fetchWay} from './osmJsonFetcher';

fetchWay(34211254)
  .map(xml => JSON.stringify(xml, null, 2))
  .subscribe(item => console.log(item));
