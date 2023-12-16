from exchange_app import *
from beaker import *
from beaker.consts import algo
from algosdk import encoding

app.build().export("./artifacts")

# accounts = localnet.kmd.get_accounts()
# owner, sender1, sender2 = accounts[0], accounts[1], accounts[2]

# # Application client for owner, sender1, and sender2
# app_client = client.ApplicationClient(
#     client=localnet.get_algod_client(),
#     app=app,
#     sender=owner.address,
#     signer=owner.signer,
# )
# create_response = app_client.create()

# app_client2 = app_client.prepare(signer=sender1.signer)
# app_client3 = app_client.prepare(signer=sender2.signer)

# app_client2.fund(100 * algo)
# app_client3.fund(100 * algo)

# # Start submission period
# app_client.call(
#     begin_submission,
#     duration = 1000,
#     sender = owner.address,
#     boxes = [(app_client.app_id, "order_book")]
# )

# print(encoding.decode_address(sender1.address))

# # Producer give offers
# app_client2.call(
#     submit_order,
#     _energy_amount  = 1000, 
#     _price_per_kwh  = 10,
#     _latitude       = "+001.3143",
#     _longtitude     = "+103.7093",
#     _sustainability = "A",
#     boxes=[(app_client2.app_id, encoding.decode_address(sender1.address)), (app_client2.app_id, "order_book")],
#     sender = sender1.address
# )

print("success")

# app_client3.call(
#     submit_order,
#     _energy_amount  = 10, 
#     _price_per_kwh  = 10,
#     _latitude       = "+51.5074",
#     _longtitude     = "-00.1278",
#     _sustainability = "B",
#     boxes=[(app_client3.app_id, encoding.decode_address(sender2.address)), (app_client3.app_id, "order_book")],
#     sender = sender2.address
# )

# print(app_client.get_global_state()['order_id'])

# # Check offers is recorded
# value = app_client3.call(
#     read_order_producer,
#     address = encoding.decode_address(sender1.address),
#     boxes=[(app_client3.app_id, encoding.decode_address(sender1.address))],
#     sender = sender2.address
# )
# print(value.return_value)

# value = app_client3.call(
#     read_order_index,
#     index = 0,
#     boxes=[(app_client2.app_id, "order_book")],
#     sender = sender2.address
# )
# print(value.return_value)

# def sortOffers():
#     offers = []
#     n = app_client.get_global_state()['order_id']

#     # Collate all offers from smart contract
#     for i in range (0,n):
#         value = app_client.call(
#             read_order_index,
#             index = i,
#             boxes=[(app_client.app_id, "order_book")],
#             sender = owner.address
#         )
#         offers.append(value.return_value)

#     # Sort based on 1) price 2) energy supply, 3) timestamp
#     def custom_sort(offer):
#         address, energy_amount, price_per_kwh, timestamp = offer
#         return (price_per_kwh, -energy_amount, timestamp)
#     sorted_offers = sorted(offers, key=custom_sort)
    
#     # Reorder index in smart contract
#     for idx, of in enumerate(sorted_offers):
#         app_client.call(
#             modify_order_index_for_sorting,
#             index = idx,
#             producer= of[0], 
#             energy_amount= of[1],
#             price_per_kwh= of[2],
#             timestamp= of[3],
#             boxes=[(app_client.app_id, "order_book")],
#             sender = owner.address
#         )

# sortOffers()
