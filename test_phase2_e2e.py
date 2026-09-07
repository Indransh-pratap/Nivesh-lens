# -*- coding: utf-8 -*-
"""
End-to-end smoke test for Phase 2 routes - real data test.
Tests with the actual logged-in user (Indransh Pratap).
"""
import sys
import time
import json
import requests
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = "http://127.0.0.1:3000"
PROXY = f"{BASE}/api/portfolio"

s = requests.Session()


def must_ok(resp, label, allowed=(200, 201)):
    if resp.status_code not in allowed:
        print(f"  [FAIL] {label}: HTTP {resp.status_code} — {resp.text[:200]}")
        return None
    return resp.json()


def section(title):
    print(f"\n{'='*60}\n{title}\n{'='*60}")


# ============================================================
# 1. Sign in as the existing user, else create new
# ============================================================
section("1. SIGN IN: Indransh Pratap (or fallback to signup)")
r = s.post(f"{BASE}/api/auth/sign-in/email", json={
    "email": "indranshpratappp@gmail.com",
    "password": "TestPassword123",
}, timeout=30)
if r.status_code != 200:
    r = s.post(f"{BASE}/api/auth/sign-in/email", json={
        "email": "indranshpratappp@gmail.com",
        "password": "indransh123",
    }, timeout=30)
if r.status_code != 200:
    print("  Cannot sign in as Indransh — creating new test user")
    r = s.post(f"{BASE}/api/auth/sign-up/email", json={
        "email": f"phase2_e2e_{int(time.time())}@test.com",
        "password": "TestPassword123!",
        "name": "Phase 2 E2E",
    }, timeout=30)
    print(f"  signup status: {r.status_code}")

# ============================================================
# 2. Get portfolios (or create one)
# ============================================================
section("2. PORTFOLIOS")
r = s.get(f"{PROXY}/portfolios", timeout=30)
portfolios = must_ok(r, "list portfolios", allowed=(200, 201))
if not portfolios:
    print("  No portfolios — creating one")
    r = s.post(f"{PROXY}/portfolios", json={"name": "Phase 2 Test"}, timeout=30)
    portfolios = must_ok(r, "create portfolio", allowed=(200, 201))
    if isinstance(portfolios, dict):
        portfolios = [portfolios]
if not portfolios:
    print("  Still no portfolios — aborting")
    sys.exit(1)
print(f"  Found {len(portfolios)} portfolios:")
for p in portfolios:
    h_count = len(p.get("holdings", []))
    print(f"    - {p['name']} (id={p['id'][:8]}..., holdings={h_count}, total={p.get('total_value', 0)})")
portfolio = next((p for p in portfolios if p.get("holdings")), portfolios[0])
portfolio_id = portfolio["id"]
print(f"  Using: {portfolio['name']} (id={portfolio_id[:8]}...)")
holdings = portfolio.get("holdings", [])
print(f"  Holdings: {len(holdings)}")
for h in holdings[:5]:
    print(f"    - {h.get('name')} ({h.get('assetType') or h.get('asset_type')}) ₹{h.get('currentValue') or h.get('current_value')}")


# ============================================================
# 3. Stress test
# ============================================================
section("3. STRESS TEST")
for scenario in ("COVID_2020", "CRISIS_2008", "BEAR_2022"):
    r = s.get(f"{PROXY}/portfolios/{portfolio_id}/phase2/stress-test?scenario={scenario}", timeout=30)
    data = must_ok(r, f"stress {scenario}")
    if not data:
        continue
    res = data["result"]
    print(f"  {scenario}: starting=₹{res['starting_value']:.0f}, loss=₹{res['estimated_loss']:.0f} ({res['loss_percent']:.1f}%), remaining=₹{res['ending_value']:.0f}")
    print(f"    confidence: {res['confidence_summary']}")
    print(f"    holdings impacted: {len(res['holdings'])}")
    for h in res['holdings'][:3]:
        print(f"      - {h['name'][:40]:40} impact=₹{h['impact']:.0f} conf={h['confidence']}")


# ============================================================
# 4. Fund swap
# ============================================================
section("4. FUND SWAP")
mf_holdings = [h for h in holdings if 'mutual' in str(h.get('assetType','')).lower() or 'mutual' in str(h.get('asset_type','')).lower() or h.get('type') == 'Mutual Fund']
if not mf_holdings:
    print("  No MF holdings in portfolio — cannot test swap")
else:
    target = mf_holdings[0]
    target_id = str(target['id'])
    print(f"  Target: {target['name'][:50]} (id={target_id[:8]}...)")

    # Get candidates
    r = s.get(f"{PROXY}/portfolios/{portfolio_id}/phase2/fund-swap/candidates?target_holding_id={target_id}", timeout=30)
    cands = must_ok(r, "swap candidates")
    if cands and cands.get('candidates'):
        print(f"  Got {len(cands['candidates'])} replacement candidates")
        replacement = cands['candidates'][0]
        print(f"  Trying: {replacement['scheme_name'][:50]} (TER {replacement['expense_ratio']*100:.2f}%)")

        r = s.post(f"{PROXY}/portfolios/{portfolio_id}/phase2/fund-swap",
                   json={"target_holding_id": target_id, "replacement_scheme_code": replacement['scheme_code']},
                   timeout=30)
        sim = must_ok(r, "run swap")
        if sim and 'before' in sim and 'after' in sim:
            print(f"  Before: score={sim['before']['score']}, hhi={sim['before']['hhi']:.4f}, top={sim['before']['top_company_exposure']:.1f}%")
            print(f"  After:  score={sim['after']['score']}, hhi={sim['after']['hhi']:.4f}, top={sim['after']['top_company_exposure']:.1f}%")
            print(f"  Delta:  score={sim['delta']['score']:+d}, hhi={sim['delta']['hhi']:+.4f}, dup_cost={sim['delta']['potential_duplicate_cost']:+.0f}")
        else:
            print(f"  Sim response: {sim}")
    else:
        print(f"  No candidates: {cands}")


# ============================================================
# 5. Correlation
# ============================================================
section("5. CORRELATION")
for lb in ("3M", "6M", "1Y", "3Y"):
    r = s.get(f"{PROXY}/portfolios/{portfolio_id}/phase2/correlation?lookback={lb}", timeout=30)
    data = must_ok(r, f"corr {lb}")
    if data and 'result' in data:
        res = data['result']
        funds = res.get('funds', [])
        matrix = res.get('matrix', [])
        print(f"  {lb}: {len(funds)} funds, {len(matrix)}x{len(matrix[0]) if matrix else 0} matrix")
        if res.get('insufficient_funds'):
            print(f"    insufficient: {[f['fund_name'][:30] for f in res['insufficient_funds']]}")
        if matrix and len(funds) >= 2:
            print(f"    sample pair: {funds[0][:20]} ↔ {funds[1][:20]} = {matrix[0][1]:.3f}")


print(f"\n{'='*60}\nDONE — review output above for any [FAIL] lines\n{'='*60}")
