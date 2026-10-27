// Short 05 adds no measurement of its own: it reuses the evidence of the long film (fl05), which re-runs ff02, ff09, ff03 and ff31 live
// and adds the composite recipe check. Import from here so the short and the long film can never disagree.
export * from '../../fl05/fixture/experiment.mjs';
