import beaker
from pyteal import *
from beaker.lib.storage import BoxList, BoxMapping
from typing import Final, Literal

MAX_OFFER = 10
CURRENCY = "ALGO"

LatitudeString = abi.StaticBytes[Literal[9]]
LongtitudeString = abi.StaticBytes[Literal[9]]
CurrencyString = abi.StaticBytes[Literal[4]]
SustainabilityString = abi.StaticBytes[Literal[1]]

class Offer(abi.NamedTuple):
    producer: abi.Field[abi.Address]      # Address of producer
    energy_amount: abi.Field[abi.Uint64]  # Energy supplied in kWH
    price_per_kwh: abi.Field[abi.Uint64]  # Price per kWH (uALGO)
    timestamp: abi.Field[abi.Uint64]      # Timestamp of offer submitted
    
    latitude: abi.Field[LatitudeString]                 # Location of producer (latitude)
    longtitude: abi.Field[LongtitudeString]             # Location of producer (longtitude)
    sustainability: abi.Field[SustainabilityString]     # Sustainability grade
    currency: abi.Field[CurrencyString]                 # Currency accepted by producer

class ExchangeState:
    submission_deadline: Final[beaker.GlobalStateValue] =  beaker.GlobalStateValue(
        stack_type=TealType.uint64,
        default=Int(0),
        descr="Timestamp at the end of the submission period",
    )
    order_id = beaker.GlobalStateValue(
        stack_type=TealType.uint64, 
        default=Int(0), 
        descr="Total number of offers made",
    )
    producers = BoxMapping(abi.Address, Offer)
    order_book = BoxList(Offer, MAX_OFFER)
    

app = beaker.Application("Exchange", state = ExchangeState())

@app.external(authorize=beaker.Authorize.only_creator())
def begin_submission(duration: abi.Uint64) -> Expr:
    return Seq(
        # Make sure that submission period hasn't started
        Assert(app.state.submission_deadline.get() == Int(0)),

        # Set deadline
        app.state.submission_deadline.set(Global.latest_timestamp() + duration.get()),

        # Initialise order id
        app.state.order_id.set(Int(0)),

        # Create box list
        Pop(app.state.order_book.create()), 

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

        # Make sure that producer has not submitted an offer before
        Assert(Not(app.state.producers[Txn.sender()].exists())),

        # Make sure that order book is not full
        Assert(app.state.order_id.get() < Int(MAX_OFFER)),

        # Add the new offer to the order book
        (producer:= abi.Address()).set(Txn.sender()),
        (energy_amount:=abi.Uint64()).set(_energy_amount.get()),
        (price_per_kwh:=abi.Uint64()).set(_price_per_kwh.get()),
        (timestamp:=abi.Uint64()).set(Global.latest_timestamp()),
        (latitude:=abi.make(LatitudeString)).set(_latitude.get()),
        (longtitude:=abi.make(LongtitudeString)).set(_longtitude.get()),
        (sustainability:=abi.make(SustainabilityString)).set(_sustainability.get()),
        (currency:=abi.make(CurrencyString)).set(Bytes(CURRENCY)),
        (offer:= Offer()).set(
            producer, 
            energy_amount, 
            price_per_kwh, 
            timestamp,
            latitude,
            longtitude,
            sustainability,
            currency
        ),
        app.state.order_book[app.state.order_id.get()].set(offer),
        app.state.producers[Txn.sender()].set(offer),

        # Increment order id by 1
        app.state.order_id.set(Add(app.state.order_id.get(), Int(1)))
    )

    
@app.external
def read_order_index(index: abi.Uint64, *, output: Offer) -> Expr:
    return app.state.order_book[index.get()].store_into(output)

@app.external
def read_order_producer(address: abi.Address, *, output: Offer) -> Expr:
    return app.state.producers[address].store_into(output)

@app.external(authorize=beaker.Authorize.only_creator())
def modify_order_index_for_sorting(
    index: abi.Uint64, 
    producer: abi.Address, 
    energy_amount: abi.Uint64,
    price_per_kwh: abi.Uint64,
    timestamp: abi.Uint64,
    latitude: abi.String,                
    longtitude: abi.String,             
    sustainability: abi.String,     
    currency: abi.String,                 

    ) -> Expr:
    return Seq(
        # Make sure that index is not out of box list
        Assert(index.get() < app.state.order_id.get()),

        (latitude:=abi.make(LatitudeString)).set(latitude.get()),
        (longtitude:=abi.make(LongtitudeString)).set(longtitude.get()),
        (sustainability:=abi.make(SustainabilityString)).set(sustainability.get()),
        (currency:=abi.make(CurrencyString)).set(currency.get()),

        # Insert order into the specified index
        (offer:= Offer()).set(
            producer, 
            energy_amount, 
            price_per_kwh, 
            timestamp,
            latitude,
            longtitude,
            sustainability,
            currency
        ),
        app.state.order_book[index.get()].set(offer),
    )
        