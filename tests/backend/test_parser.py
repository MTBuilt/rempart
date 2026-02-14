"""Tests for the nftables JSON parser."""

from rempart.nft.parser import parse_ruleset_json


def test_parse_basic_structure(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)

    # Should have 3 tables: inet filter, ip nat, inet rate_limiter
    assert len(model.tables) == 3

    inet_filter = model.tables[0]
    assert inet_filter.table.family.value == "inet"
    assert inet_filter.table.name == "filter"

    ip_nat = model.tables[1]
    assert ip_nat.table.family.value == "ip"
    assert ip_nat.table.name == "nat"

    rate_limiter = model.tables[2]
    assert rate_limiter.table.family.value == "inet"
    assert rate_limiter.table.name == "rate_limiter"


def test_parse_chains(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)

    # inet filter should have 3 chains: input, forward, output
    inet_filter = model.tables[0]
    assert len(inet_filter.chains) == 3

    chain_names = [c.chain.name for c in inet_filter.chains]
    assert chain_names == ["input", "forward", "output"]

    # input chain should be base chain with hook and policy
    input_chain = inet_filter.chains[0]
    assert input_chain.chain.type == "filter"
    assert input_chain.chain.hook == "input"
    assert input_chain.chain.prio == 0
    assert input_chain.chain.policy == "drop"


def test_parse_rules(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)

    # input chain should have 6 rules
    input_chain = model.tables[0].chains[0]
    assert len(input_chain.rules) == 6

    # First rule: ct state established,related accept
    first_rule = input_chain.rules[0]
    assert first_rule.comment == "Allow established connections"
    assert len(first_rule.expr) == 2  # match + accept

    # SSH rule should have counter
    ssh_rule = input_chain.rules[2]
    assert ssh_rule.comment == "Allow SSH"
    assert len(ssh_rule.expr) == 3  # match + counter + accept


def test_parse_sets(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)

    # inet filter should have 1 set: blacklist
    inet_filter = model.tables[0]
    assert len(inet_filter.sets) == 1

    blacklist = inet_filter.sets[0]
    assert blacklist.name == "blacklist"
    assert blacklist.type == "ipv4_addr"
    assert "interval" in blacklist.flags
    assert "timeout" in blacklist.flags
    assert blacklist.timeout == 3600


def test_parse_nat_rules(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)

    ip_nat = model.tables[1]
    assert len(ip_nat.chains) == 2

    # postrouting chain with masquerade
    postrouting = ip_nat.chains[0]
    assert postrouting.chain.name == "postrouting"
    assert len(postrouting.rules) == 1
    masq_rule = postrouting.rules[0]
    assert any("masquerade" in stmt for stmt in masq_rule.expr)

    # prerouting chain with dnat
    prerouting = ip_nat.chains[1]
    assert prerouting.chain.name == "prerouting"
    assert len(prerouting.rules) == 1
    dnat_rule = prerouting.rules[0]
    assert dnat_rule.comment == "Forward port 8080 to internal web server"


def test_parse_empty_ruleset():
    data = {"nftables": [{"metainfo": {"version": "1.0.9", "release_name": "test", "json_schema_version": 1}}]}
    model = parse_ruleset_json(data)
    assert len(model.tables) == 0


def test_parse_table_only():
    data = {
        "nftables": [
            {"metainfo": {"version": "1.0.9", "release_name": "test", "json_schema_version": 1}},
            {"table": {"family": "inet", "name": "test", "handle": 1}},
        ]
    }
    model = parse_ruleset_json(data)
    assert len(model.tables) == 1
    assert model.tables[0].table.name == "test"
    assert len(model.tables[0].chains) == 0
