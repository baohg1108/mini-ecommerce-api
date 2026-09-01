Trong tính tiền số tiền giảm không thể vượt quá tổng số tiền đơn hàng. Nếu vượt quá, mặc định số tiền là 1000 VND, không thể để âm.

Vd:
orderAmount: 50 VND
voucherSystem: 40 VND
voucherShop: 20 VND

Step: (Ưu tiên trừ voucherSystem trước, sau đó mới trừ voucherShop)
step 1: orderAmount - voucherSystem = 50 - 40 = 10 VND
step 2: orderAmount - voucherShop = 10 - 20 = -10 VND (không thể âm, nên mặc định là 1000 VND)
=> vậy số tiền giảm cuối cùng là 1000 VND.
