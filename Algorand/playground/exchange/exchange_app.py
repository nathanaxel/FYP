import beaker
from pyteal import *
from beaker.lib.storage import BoxList, BoxMapping
from typing import Final, Literal

MAX_OFFER = 10
MAX_ORDER = 10
CURRENCY = "ALGO"

LatitudeString = abi.StaticBytes[Literal[9]]
LongtitudeString = abi.StaticBytes[Literal[9]]
CurrencyString = abi.StaticBytes[Literal[4]]
SustainabilityString = abi.StaticBytes[Literal[1]]

class Offer(abi.NamedTuple):
    producer: abi.Field[abi.Address]                    # Address of producer
    energy_amount: abi.Field[abi.Uint64]                # Energy supplied in kWH
    price_per_kwh: abi.Field[abi.Uint64]                # Price per kWH (uALGO)
    
    latitude: abi.Field[LatitudeString]                 # Location of producer (latitude)
    longtitude: abi.Field[LongtitudeString]             # Location of producer (longtitude)
    sustainability: abi.Field[SustainabilityString]     # Sustainability grade
    currency: abi.Field[CurrencyString]                 # Currency accepted by producer

class Order(abi.NamedTuple):
    consumer: abi.Field[abi.Address]                    # Address of consumer
    energy_amount: abi.Field[abi.Uint64]                # Energy required in kWH
    price_per_kwh: abi.Field[abi.Uint64]                # Maxiumum Price per kWH (uALGO)
    
    latitude: abi.Field[LatitudeString]                 # Location of consumer (latitude)
    longtitude: abi.Field[LongtitudeString]             # Location of consumer (longtitude)
    sustainability: abi.Field[SustainabilityString]     # Sustainability grade required
    currency: abi.Field[CurrencyString]                 # Currency accepted by consumer

class ExchangeState:
    submission_deadline: Final[beaker.GlobalStateValue] =  beaker.GlobalStateValue(
        stack_type=TealType.uint64,
        default=Int(0),
        descr="Timestamp at the end of the submission period",
    )
    order_id = beaker.GlobalStateValue(
        stack_type=TealType.uint64, 
        default=Int(0), 
        descr="Total number of orders made",
    )
    offer_id = beaker.GlobalStateValue(
        stack_type=TealType.uint64, 
        default=Int(0), 
        descr="Total number of offers made",
    )
    producers = BoxMapping(abi.Address, Offer)
    consumers = BoxMapping(abi.Address, Order)
    offer_book = BoxList(Offer, MAX_OFFER)
    order_book = BoxList(Order, MAX_OFFER)
    

app = beaker.Application("Exchange", state = ExchangeState())

@app.external(authorize=beaker.Authorize.only_creator())
def begin_submission(duration: abi.Uint64) -> Expr:
    return Seq(
        # Make sure that submission period hasn't started
        Assert(app.state.submission_deadline.get() == Int(0)),

        # Set deadline
        app.state.submission_deadline.set(Global.latest_timestamp() + duration.get()),

        # Initialise order id + offer id
        app.state.order_id.set(Int(0)),
        app.state.offer_id.set(Int(0)),

        # Create box list
        Pop(app.state.order_book.create()), 
        Pop(app.state.offer_book.create()), 
    )

@app.external
def submit_offer(
    _energy_amount  : abi.Uint64, 
    _price_per_kwh  : abi.Uint64,
    _latitude       : abi.String,
    _longtitude     : abi.String,
    _sustainability : abi.String
    ) -> Expr:
    return Seq(
        # Make sure that submission period has started and hasn't ended
        Assert(Global.latest_timestamp() < app.state.submission_deadline.get()),

        # Make sure energy amount is non-zero
        Assert(_energy_amount.get() > Int(0)),

        # Make sure that producer has not submitted an offer before
        Assert(Not(app.state.producers[Txn.sender()].exists())),

        # Make sure that offer book is not full
        Assert(app.state.offer_id.get() < Int(MAX_OFFER)),

        # Add the new offer to the offer book
        (producer:= abi.Address()).set(Txn.sender()),
        (energy_amount:=abi.Uint64()).set(_energy_amount.get()),
        (price_per_kwh:=abi.Uint64()).set(_price_per_kwh.get()),
        (latitude:=abi.make(LatitudeString)).set(_latitude.get()),
        (longtitude:=abi.make(LongtitudeString)).set(_longtitude.get()),
        (sustainability:=abi.make(SustainabilityString)).set(_sustainability.get()),
        (currency:=abi.make(CurrencyString)).set(Bytes(CURRENCY)),
        (offer:= Offer()).set(
            producer, 
            energy_amount, 
            price_per_kwh, 
            latitude,
            longtitude,
            sustainability,
            currency
        ),
        app.state.offer_book[app.state.offer_id.get()].set(offer),
        app.state.producers[Txn.sender()].set(offer),

        # Increment order id by 1
        app.state.offer_id.set(Add(app.state.offer_id.get(), Int(1)))
    )

@app.external
def submit_order(
    _energy_amount  : abi.Uint64, 
    _price_per_kwh  : abi.Uint64,
    _latitude       : abi.String,
    _longtitude     : abi.String,
    _sustainability : abi.String
    ) -> Expr:
    return Seq(
        # Make sure that submission period has started and hasn't ended
        Assert(Global.latest_timestamp() < app.state.submission_deadline.get()),

        # Make sure energy amount is non-zero
        Assert(_energy_amount.get() > Int(0)),

        # Make sure that consumer has not submitted an offer before
        Assert(Not(app.state.consumers[Txn.sender()].exists())),

        # Make sure that order book is not full
        Assert(app.state.order_id.get() < Int(MAX_ORDER)),

        # Add the new offer to the order book
        (consumer:= abi.Address()).set(Txn.sender()),
        (energy_amount:=abi.Uint64()).set(_energy_amount.get()),
        (price_per_kwh:=abi.Uint64()).set(_price_per_kwh.get()),
        (latitude:=abi.make(LatitudeString)).set(_latitude.get()),
        (longtitude:=abi.make(LongtitudeString)).set(_longtitude.get()),
        (sustainability:=abi.make(SustainabilityString)).set(_sustainability.get()),
        (currency:=abi.make(CurrencyString)).set(Bytes(CURRENCY)),
        (order:= Order()).set(
            consumer, 
            energy_amount, 
            price_per_kwh, 
            latitude,
            longtitude,
            sustainability,
            currency
        ),
        app.state.order_book[app.state.order_id.get()].set(order),
        app.state.consumers[Txn.sender()].set(order),

        # Increment order id by 1
        app.state.order_id.set(Add(app.state.order_id.get(), Int(1)))
    )

    
@app.external
def read_offer_index(index: abi.Uint64, *, output: Offer) -> Expr:
    return app.state.offer_book[index.get()].store_into(output)

@app.external
def read_order_index(index: abi.Uint64, *, output: Order) -> Expr:
    return app.state.order_book[index.get()].store_into(output)

@app.external
def read_offer_producer(address: abi.Address, *, output: Offer) -> Expr:
    return app.state.producers[address].store_into(output)


        