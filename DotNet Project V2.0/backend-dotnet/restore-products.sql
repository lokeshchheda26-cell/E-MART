-- Corrected version of your product_master restore script: `points_to_be_earned` removed
-- (it isn't a real column in this schema, nor did it exist in the original Java entity —
-- only `points_to_be_redeemed` exists). Everything else preserved exactly as you had it.

INSERT INTO product_master
(prod_id, brand, cardholder_price, created_at, prod_long_desc,
 mrp_price, points_to_be_redeemed, prod_image_path, prod_name,
 prod_short_desc, status, stock, updated_at, catmaster_id,
 subcat_master_id, on_sale, sale_end_date, sale_price)
VALUES

(4, NULL, 74999.00, '2026-07-23 18:55:01.103087',
 'Apple iPhone 15 with advanced camera system and powerful performance.',
 79999.00, 750, '/Images/ElectronicsAndAppliances/iphone.png', 'Apple iPhone 15',
 'Apple iPhone 15 with 128GB storage', b'1', 100, '2026-07-27 13:07:28.021818',
 13, NULL, b'0', NULL, NULL),

(5, NULL, 64999.00, '2026-07-23 18:55:52.922368',
 'Samsung 55 inch 4K Ultra HD Smart LED TV with smart features.',
 69999.00, 400, 'public/Images/ElectronicsAndAppliances/samsung.png', 'Samsung Smart TV',
 'Samsung 55 inch 4K Smart TV', b'1', 100, '2026-07-27 13:07:28.105538',
 19, NULL, b'0', NULL, NULL),

(6, NULL, 41999.00, '2026-07-23 18:56:46.350688',
 'Experience cinema-quality sound at home with this powerful Sony home theatre system.',
 45999.00, 300, 'public/Images/ElectronicsAndAppliances/homet.png', 'Sony Home Theatre',
 'Sony powerful surround sound home theatre system', b'1', 100, '2026-07-27 13:07:28.105538',
 14, NULL, b'0', NULL, NULL),

(8, NULL, 59999.00, '2026-07-23 19:22:33.667139',
 'Capture high-quality photos and videos with this professional Canon SLR camera.',
 64999.00, 450, 'public/Images/ElectronicsAndAppliances/SLRCam.png', 'Canon SLR Camera',
 'Canon professional SLR camera for photography', b'1', 100, '2026-07-27 13:07:28.105538',
 15, NULL, b'0', NULL, NULL),

(9, NULL, 69999.00, '2026-07-23 19:23:23.268148',
 'Professional DSLR camera with advanced features for photography enthusiasts.',
 74999.00, 500, 'public/Images/ElectronicsAndAppliances/DSLRCam.png', 'Canon DSLR Camera',
 'Canon DSLR camera with high resolution image quality', b'1', 100, '2026-07-27 13:07:28.106540',
 16, NULL, b'0', NULL, NULL),

(10, NULL, 160.00, '2026-07-23 19:23:56.376404',
 'High-quality and nutritious moong dal suitable for everyday cooking.',
 180.00, 10, 'public/Images/Grocery/Pulses/MoongDal.png', 'Moong Dal',
 'Premium quality yellow moong dal', b'1', 100, '2026-07-27 13:07:28.106540',
 20, NULL, b'0', NULL, NULL),

(11, NULL, 180.00, '2026-07-23 19:24:09.639538',
 'Fresh and premium quality Toor Dal packed hygienically for your family.',
 200.00, 12, 'public/Images/Grocery/Pulses/ToorDal.png', 'Toor Dal',
 'Premium quality Toor Dal for daily cooking', b'1', 100, '2026-07-27 13:07:28.107550',
 21, NULL, b'0', NULL, NULL),

(12, NULL, 420.00, '2026-07-23 19:24:19.312701',
 'Premium quality long-grain basmati rice perfect for biryani and everyday meals.',
 450.00, 25, 'public/Images/Grocery/Rice/DaawatBasmatiRice.png', 'Daawat Basmati Rice',
 'Premium long grain Daawat Basmati Rice', b'1', 100, '2026-07-27 13:07:28.107550',
 22, NULL, b'0', NULL, NULL),

(13, NULL, 450.00, '2026-07-23 19:24:28.661078',
 'Long and aromatic basmati rice from India Gate, perfect for special meals.',
 480.00, 28, 'public/Images/Grocery/Rice/IndiaGateBasmatiRice.png', 'India Gate Basmati Rice',
 'Premium quality India Gate Basmati Rice', b'1', 100, '2026-07-27 13:07:28.109540',
 23, NULL, b'0', NULL, NULL),

(14, NULL, 105.00, '2026-07-23 19:24:38.004477',
 'High-quality red chilli powder that adds rich color and spicy flavor to your dishes.',
 120.00, 8, 'public/Images/Grocery/Spices/RedChilliPowder.png', 'Red Chilli Powder',
 'Pure and spicy red chilli powder', b'1', 100, '2026-07-27 13:07:28.109540',
 24, NULL, b'0', NULL, NULL),

(15, NULL, 90.00, '2026-07-23 19:24:51.063096',
 'Premium quality turmeric powder with natural color and rich flavor.',
 100.00, 7, 'public/Images/Grocery/Spices/TurmericPowder.png', 'Turmeric Powder',
 'Pure premium quality turmeric powder', b'1', 100, '2026-07-27 13:07:28.110537',
 25, NULL, b'0', NULL, NULL),

(16, NULL, 220.00, '2026-07-23 19:25:00.824777',
 'Aromatic and refreshing black tea made from carefully selected tea leaves.',
 250.00, 15, 'public/Images/Beverages/BlackTea.png', 'Premium Black Tea',
 'Refreshing premium black tea', b'1', 100, '2026-07-27 13:07:28.110537',
 26, NULL, b'0', NULL, NULL),

(17, NULL, 70.00, '2026-07-23 19:25:09.827326',
 'Refreshing coconut water packed with natural nutrients and electrolytes.',
 80.00, 5, 'public/Images/Beverages/CoconutWater.png', 'Fresh Coconut Water',
 'Natural refreshing coconut water', b'1', 100, '2026-07-27 13:07:28.111544',
 27, NULL, b'0', NULL, NULL),

(18, NULL, 320.00, '2026-07-23 19:25:24.500402',
 'Premium instant coffee with rich aroma and delicious taste for coffee lovers.',
 350.00, 20, 'public/Images/Beverages/Coffee.png', 'Premium Instant Coffee',
 'Rich and aromatic instant coffee', b'1', 100, '2026-07-27 13:07:28.113004',
 28, NULL, b'0', NULL, NULL),

(19, NULL, 100.00, '2026-07-23 19:25:34.263135',
 'A refreshing energy drink designed to provide energy and hydration.',
 120.00, 8, 'public/Images/Beverages/EnergyDrink.png', 'Energy Drink',
 'Refreshing energy drink for active lifestyle', b'1', 100, '2026-07-27 13:07:28.113004',
 29, NULL, b'0', NULL, NULL),

(20, NULL, 130.00, '2026-07-23 19:25:46.212127',
 'Delicious and refreshing fruit drink suitable for enjoying anytime.',
 150.00, 10, 'public/Images/Beverages/RealGo.png', 'Real Go Fruit Drink',
 'Refreshing fruit-based beverage', b'1', 100, '2026-07-27 13:07:28.116024',
 30, NULL, b'0', NULL, NULL);
