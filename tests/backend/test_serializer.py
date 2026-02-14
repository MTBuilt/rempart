"""Tests for the nftables text serializer."""

from rempart.nft.parser import parse_ruleset_json
from rempart.nft.serializer import serialize_ruleset


def test_serialize_roundtrip_structure(sample_ruleset_json):
    """Parse JSON then serialize to text - verify structure is preserved."""
    model = parse_ruleset_json(sample_ruleset_json)
    text = serialize_ruleset(model)

    # Should start with flush ruleset
    assert text.startswith("flush ruleset\n")

    # Should contain both tables
    assert "table inet filter {" in text
    assert "table ip nat {" in text

    # Should contain chains
    assert "chain input {" in text
    assert "chain forward {" in text
    assert "chain output {" in text
    assert "chain postrouting {" in text
    assert "chain prerouting {" in text


def test_serialize_base_chain_properties(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)
    text = serialize_ruleset(model)

    # Input chain: type filter hook input priority 0; policy drop;
    assert "type filter hook input priority 0; policy drop;" in text
    assert "type nat hook postrouting priority 100; policy accept;" in text


def test_serialize_rules_with_comments(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)
    text = serialize_ruleset(model)

    assert 'comment "Allow established connections"' in text
    assert 'comment "Allow SSH"' in text
    assert 'comment "Allow HTTP/HTTPS"' in text


def test_serialize_match_expressions(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)
    text = serialize_ruleset(model)

    # ct state match
    assert "ct state" in text
    # meta iifname match
    assert "meta iifname lo" in text
    # tcp dport match
    assert "tcp dport 22" in text
    # Set match
    assert "tcp dport { 80, 443 }" in text


def test_serialize_statements(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)
    text = serialize_ruleset(model)

    assert "accept" in text
    assert "drop" in text
    assert "counter" in text
    assert "masquerade" in text
    assert "dnat to" in text


def test_serialize_set(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)
    text = serialize_ruleset(model)

    assert "set blacklist {" in text
    assert "type ipv4_addr" in text
    assert "flags interval, timeout" in text
    assert "timeout 3600s" in text


def test_serialize_log_statement(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)
    text = serialize_ruleset(model)

    assert 'log prefix "INPUT_DROP: " level warn' in text


def test_serialize_limit_statement(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)
    text = serialize_ruleset(model)

    assert "limit rate 5/second" in text


def test_serialize_nat_dnat(sample_ruleset_json):
    model = parse_ruleset_json(sample_ruleset_json)
    text = serialize_ruleset(model)

    assert "dnat to 192.168.1.10" in text


def test_serialize_no_flush():
    from rempart.nft.models import (
        ChainModel,
        NftChain,
        NftTable,
        RulesetModel,
        TableModel,
    )

    model = RulesetModel(
        tables=[
            TableModel(
                table=NftTable(family="inet", name="test", handle=1),
                chains=[
                    ChainModel(
                        chain=NftChain(
                            family="inet",
                            table="test",
                            name="mychain",
                            handle=1,
                        ),
                    )
                ],
            )
        ]
    )
    text = serialize_ruleset(model, flush=False)
    assert not text.startswith("flush ruleset")
    assert "table inet test {" in text
    assert "chain mychain {" in text
