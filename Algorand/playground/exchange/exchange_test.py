import pytest
from exchange_app import *
from algosdk import transaction
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    TransactionWithSigner,
)
from algosdk.dryrun_results import DryrunResponse
from algosdk.encoding import encode_address
from beaker import *

##########
# fixtures
##########


@pytest.fixture(scope="module")
def create_app():
    global accounts
    global creator_acct
    global app_client
    accounts = localnet.kmd.get_accounts()
    creator_acct = accounts.pop()

    app_client = client.ApplicationClient(
        client=localnet.get_algod_client(),
        app=app,
        sender=creator_acct.address,
        signer=creator_acct.signer,
    )
    app_client.create()

@pytest.fixture(scope="module")
def begin_submission(sender, duration: int):
    app_client.call(
        begin_submission,
        duration = 100,
        boxes=[(app_client.app_id, "Box1")],
        sender= sender
    )

@pytest.fixture(scope="module")
def submit_order(sender, energy: int, value: int):
    app_client.call(
        submit_order,
        duration = 100,
        boxes=[(app_client.app_id, "Box1")],
        sender= sender
    )

##############
# tests
##############

@pytest.mark.start_submission
def test_start_submission(create_app):
    assert app_client.get_global_state()["submission_deadline"] == 0