'use strict';

// Runtime measured from each public YouTube watch page on 2026-09-24.
// Public visual media is normally at most 180 seconds. A 181–300 second item
// needs an explicit, already-supported editorial reason. Anything longer, or
// without a measured duration, stays unpublished.
const checkedAt = '2026-09-24';
const durations = {
  dt33RGSRuo0: 339,
  '8V9iHAM82bc': 487,
  cFAtkUlajUI: 662,
  ljxbhH_n9ak: 225,
  JkxNRpc7NJU: 1437,
  ELXE7PGOBT8: 102,
  _Em5H7KlBSs: 161,
  HrRTahmwIYI: 125,
  FDu7cbNuaXQ: 63,
  cyJYxL20Z3A: 380,
  WkKHB5toNIg: 274,
  '5riinr6xpWo': 15,
  jFCmoShi5ns: 712,
  K_LDvvjC8Uw: 180,
  '9lvk-4mVjC0': 104,
  PJ3RKuybYzU: 60,
  rakrdG7P2Jo: 82,
  'f-Fr5ga8u3k': 109,
  '80y5COiKdDw': 56,
  FReSNt44TX4: 68,
  syHFyTLO1kY: 2051,
  '9x2BEUFwoIw': 2069,
  zc7OjXup06Y: 1865,
  pm7RBghFt0I: 119,
  '0dkX_-JxhgI': 114,
  Q3J9ewosl1A: 32,
  zQJz9x7XzxI: 726,
  hhaGzqTeIuw: 799,
  bLGpAaB2zUA: 60,
  '8tXP7QSh12Y': 299,
  dl8LHw1j_HI: 85,
  '6M0vx8wLEbM': 115,
  '-Jz4grZPstA': 224,
  '1-o7fmQqSNg': 292,
  'Xswbd-IOihs': 363,
  TFGQrtHflSg: 104,
  pCDd7LkhkfE: 30,
  rjFh_eBwV_k: 30,
  TZRBBxcktuU: 15,
  '15crm4zuB04': 64
};

// These restate the source-supported relation already approved for the item;
// they are release-gate evidence, not new public editorial copy.
const exceptions = {
  ljxbhH_n9ak: '商店街公式のWeb CMで、店と通りを一つの短編として描く。',
  WkKHB5toNIg: '自治体公式の地区案内で、複数の場所を一続きに紹介する。',
  '8tXP7QSh12Y': '区の公式アーカイブで、閉館した文化施設の来歴を記録する。',
  '-Jz4grZPstA': '配給元公式の作品名一致の特別映像。',
  '1-o7fmQqSNg': '製作元公式の本PVで、既存の作品と街の関係に不可欠。'
};

const durationFor = id => durations[id];
const allowed = id => Number.isInteger(durations[id])
  && durations[id] <= 300
  && (durations[id] <= 180 || Boolean(exceptions[id]));

module.exports = { checkedAt, durations, exceptions, durationFor, allowed };
