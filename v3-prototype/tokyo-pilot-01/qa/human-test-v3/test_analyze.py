#!/usr/bin/env python3
import csv, json, subprocess, tempfile
from pathlib import Path

ANALYZER = Path(__file__).with_name('analyze.py')
HEADERS = [
    'participant_id','order','prior_pilot_exposure','recruitment_relation','device','consent_confirmed','first_open_latency_s',
    'voluntary_open','first_object','opened_objects','objects_opened',
    'raw_spontaneous_utterance','official_action','occasion_answer','return_desire',
    'return_reason','current_alternative','existing_alternative_sufficient',
    'distinct_v3_use','distinct_use_reason','first_reveal_payoff',
    'first_reveal_payoff_reason','unprompted_feature_request','moderator_notes',
]
ORDERS=['abc','acb','bac','bca','cab','cba']
OBJ={'a':'manuscript-cafe','b':'hachiko-taxidermy','c':'meguro-tapeworm'}

def row(i, opened=True, ret='yes', latency='5', reveal='yes', depth=1,
        exposure='no', relation='unknown'):
    order=ORDERS[(i-1)%6]
    ids=[OBJ[c] for c in order[:depth]] if opened else []
    return {
        'participant_id':f'P{i:02d}','order':order,
        'prior_pilot_exposure':exposure,'recruitment_relation':relation,
        'device':'mobile','consent_confirmed':'yes',
        'first_open_latency_s':latency if opened else '', 'voluntary_open':'yes' if opened else 'no',
        'first_object':ids[0] if ids else '', 'opened_objects':';'.join(ids), 'objects_opened':str(len(ids)),
        'raw_spontaneous_utterance':'','official_action':'no','occasion_answer':'','return_desire':ret,
        'return_reason':'','current_alternative':'Instagram','existing_alternative_sufficient':'no',
        'distinct_v3_use':'yes','distinct_use_reason':'','first_reveal_payoff':reveal if opened else '',
        'first_reveal_payoff_reason':'短い生回答' if opened and reveal else '',
        'unprompted_feature_request':'','moderator_notes':''
    }

def run(rows):
    with tempfile.TemporaryDirectory() as td:
        td=Path(td); c=td/'s.csv'; j=td/'r.json'; m=td/'r.md'
        with c.open('w',encoding='utf-8',newline='') as f:
            w=csv.DictWriter(f,fieldnames=HEADERS); w.writeheader(); w.writerows(rows)
        cp=subprocess.run(['python3',str(ANALYZER),str(c),'--json',str(j),'--md',str(m)],capture_output=True,text=True)
        data=json.loads(j.read_text()) if j.exists() else None
        return cp,data

def test_empty():
    rows=[]
    for i in range(1,19):
        r={h:'' for h in HEADERS}; r['participant_id']=f'P{i:02d}'; r['order']=ORDERS[(i-1)%6]; rows.append(r)
    cp,d=run(rows); assert cp.returncode==0,cp.stdout+cp.stderr; assert d['status']=='INCOMPLETE' and d['completed_n']==0

def test_go():
    rows=[row(i,ret='yes' if i<=6 else 'maybe',latency=str(i),reveal='yes') for i in range(1,13)]
    # set intended reveal distribution explicitly
    vals=['yes']*6+['maybe']*3+['no']*3
    for i,r in enumerate(rows): r['first_reveal_payoff']=vals[i]
    cp,d=run(rows); assert cp.returncode==0,cp.stdout+cp.stderr
    assert d['status']=='GO_CANDIDATE'; assert d['primary']['object_open_rate_pct']==100.0; assert d['secondary']['return_yes_pct']==50.0
    assert d['first_pull_diagnostics']['first_open_latency_s']['median']==6.5
    assert d['reveal_payoff_diagnostics']['yes_pct']==50.0

def test_missing_diagnostics_are_warnings_not_core_failure():
    rows=[row(i,ret='yes' if i<=6 else 'maybe') for i in range(1,13)]
    rows[0]['first_open_latency_s']=''; rows[1]['first_reveal_payoff']=''; rows[1]['first_reveal_payoff_reason']=''
    cp,d=run(rows); assert cp.returncode==0,cp.stdout+cp.stderr
    assert d['status']=='GO_CANDIDATE'
    assert d['first_pull_diagnostics']['first_open_latency_s']['n_captured']==11
    assert d['reveal_payoff_diagnostics']['n_captured']==11
    assert d['decision_flags']['diagnostic_missing_does_not_invalidate_core_row'] is True

def test_nonopener_diagnostic_contradiction_fails():
    r=row(1,opened=False,ret='no'); r['first_open_latency_s']='8'; r['first_reveal_payoff']='yes'
    cp,_=run([r]); assert cp.returncode!=0; assert 'voluntary_open=no requires blank first_open_latency_s' in cp.stdout


def test_reveal_reason_without_value_fails():
    r=row(1,opened=True,ret='yes'); r['first_reveal_payoff']=''; r['first_reveal_payoff_reason']='答えだけ残っている'
    cp,_=run([r]); assert cp.returncode!=0; assert 'first_reveal_payoff_reason requires' in cp.stdout

def test_count_contradiction_fails():
    r=row(1,depth=2); r['objects_opened']='1'; cp,_=run([r]); assert cp.returncode!=0; assert 'opened_objects count 2 != objects_opened 1' in cp.stdout

def test_first_object_order_fails():
    r=row(1,depth=2); ids=r['opened_objects'].split(';'); r['first_object']=ids[1]; cp,_=run([r]); assert cp.returncode!=0; assert 'first_object must equal the first ID' in cp.stdout

def test_free_text_never_changes_metrics():
    a=[row(i,ret='yes' if i<=6 else 'maybe') for i in range(1,13)]; b=[dict(x) for x in a]
    noisy='最悪 最高 不安 depression happy sad AIおすすめ 保存して これは診断です'
    for r in b:
        for k in ['raw_spontaneous_utterance','return_reason','first_reveal_payoff_reason','moderator_notes']: r[k]=noisy
    cpa,da=run(a); cpb,db=run(b); assert cpa.returncode==cpb.returncode==0; assert da==db

def test_prior_exposure_excluded_from_primary():
    """事前露出のある participant は primary valid n にも GO 判定にも入らない。"""
    rows = [row(i) for i in range(1, 13)]
    rows.append(row(13, exposure='yes'))
    rows.append(row(14, exposure='yes'))
    for i in range(15, 19):
        r = {h: '' for h in HEADERS}; r['participant_id'] = f'P{i:02d}'; r['order'] = ORDERS[(i-1) % 6]
        rows.append(r)
    cp, d = run(rows)
    assert cp.returncode == 0, cp.stdout + cp.stderr
    assert d['completed_n'] == 12, d['completed_n']
    assert d['prior_exposure_excluded_n'] == 2, d['prior_exposure_excluded_n']
    assert d['prior_exposure_excluded_ids'] == ['P13', 'P14']
    assert d['decision_flags']['prior_exposure_excluded_from_primary'] is True


def test_recruitment_relation_validity_note():
    """close_tie に偏った sample は破棄せず、validity note として出す。"""
    rows = [row(i, relation='close_tie' if i <= 8 else 'unknown') for i in range(1, 13)]
    for i in range(13, 19):
        r = {h: '' for h in HEADERS}; r['participant_id'] = f'P{i:02d}'; r['order'] = ORDERS[(i-1) % 6]
        rows.append(r)
    cp, d = run(rows)
    assert cp.returncode == 0, cp.stdout + cp.stderr
    q = d['recruitment_quality']
    assert q['counted_n'] == 12 and q['close_tie'] == 8 and q['unknown'] == 4
    assert q['target_two_thirds_weak_or_unknown_met'] is False
    # 破棄はしない
    assert d['completed_n'] == 12


def test_return_unclear_is_valid_and_not_yes():
    """unclear は valid response。primary n に残り、Yes numerator へは入らない。"""
    # yes 5 / maybe 3 / unclear 4 の balanced n=12
    vals = ['yes']*5 + ['maybe']*3 + ['unclear']*4
    rows = [row(i, ret=vals[i-1]) for i in range(1, 13)]
    cp, d = run(rows)
    assert cp.returncode == 0, cp.stdout + cp.stderr
    # unclear participant は除外されない
    assert d['completed_n'] == 12, d['completed_n']
    assert d['minimum_n_reached'] is True
    sec = d['secondary']
    assert sec['return_unclear_n'] == 4, sec
    assert sec['return_unclear_pct'] == 33.3, sec
    # Yes numerator へ入らない。denominator は primary-valid n のまま。
    assert sec['return_yes_n'] == 5, sec
    assert sec['return_yes_pct'] == round(100*5/12, 1), sec
    assert sec['return_maybe_n'] == 3, sec
    assert d['decision_flags']['return_unclear_is_valid_and_not_yes'] is True
    # threshold は不変: 5/12 = 41.7% >= 40% なので GO_CANDIDATE
    assert d['status'] == 'GO_CANDIDATE', d['status']


def test_return_unclear_does_not_reach_threshold_by_itself():
    """unclear を Yes 側に寄せて解釈していないことを、閾値割れ側でも確認する。"""
    vals = ['yes']*4 + ['unclear']*8
    rows = [row(i, ret=vals[i-1]) for i in range(1, 13)]
    cp, d = run(rows)
    assert cp.returncode == 0, cp.stdout + cp.stderr
    assert d['completed_n'] == 12
    assert d['secondary']['return_yes_n'] == 4
    assert d['secondary']['return_unclear_n'] == 8
    # 4/12 = 33.3% < 40% -> GO にはならない（unclear を救済に使わない）
    assert d['status'] == 'CONTINUE_OR_REVISE', d['status']
    assert d['decision_flags']['open_return_metrics_threshold_met'] is False


def test_return_desire_rejects_unknown_value():
    r = row(1, ret='probably')
    cp, _ = run([r])
    assert cp.returncode != 0
    assert 'return_desire must be yes/maybe/no/unclear' in cp.stdout


def main():
    tests=[test_empty,test_go,test_missing_diagnostics_are_warnings_not_core_failure,test_nonopener_diagnostic_contradiction_fails,test_reveal_reason_without_value_fails,test_count_contradiction_fails,test_first_object_order_fails,test_free_text_never_changes_metrics,test_prior_exposure_excluded_from_primary,test_recruitment_relation_validity_note,test_return_unclear_is_valid_and_not_yes,test_return_unclear_does_not_reach_threshold_by_itself,test_return_desire_rejects_unknown_value]
    for t in tests: t()
    print(f'HUMAN_TEST_V3_ANALYZER_GO {len(tests)}/{len(tests)}')

if __name__=='__main__': main()
