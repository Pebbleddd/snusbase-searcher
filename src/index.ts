import {Searcher} from "./Searcher";

const searcher: Searcher = new Searcher();

searcher.run().then((value) => console.log(`Finished ${value} Batches complete`));