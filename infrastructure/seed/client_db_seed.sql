-- client id reel = f19979a8-ac3a-4d33-b2d5-66ef799bfec5 (testclient1)
INSERT INTO orders (id, client_id, "orderNumber", vehicles, "requestedDeliveryDate", "deliveryAddress", status, "createdAt", "updatedAt")
VALUES
  ('a1000000-0000-0000-0000-000000000001','f19979a8-ac3a-4d33-b2d5-66ef799bfec5','ORD-2025-001',
   '[{"vehicleType":"Camion 5T","quantity":1}]','2025-06-01',
   '{"street":"12 Rue de la Paix","city":"Paris","zip":"75001"}',
   'PENDING_VALIDATION', NOW() - INTERVAL '2 hours', NOW()),
  ('a1000000-0000-0000-0000-000000000002','f19979a8-ac3a-4d33-b2d5-66ef799bfec5','ORD-2025-002',
   '[{"vehicleType":"Fourgon 3T","quantity":2}]','2025-06-02',
   '{"street":"45 Avenue Montaigne","city":"Lyon","zip":"69001"}',
   'VALIDATED', NOW() - INTERVAL '5 hours', NOW()),
  ('a1000000-0000-0000-0000-000000000003','f19979a8-ac3a-4d33-b2d5-66ef799bfec5','ORD-2025-003',
   '[{"vehicleType":"Camion 10T","quantity":1}]','2025-06-03',
   '{"street":"8 Boulevard Haussmann","city":"Marseille","zip":"13001"}',
   'PLANNED', NOW() - INTERVAL '1 day', NOW()),
  ('a1000000-0000-0000-0000-000000000004','f19979a8-ac3a-4d33-b2d5-66ef799bfec5','ORD-2025-004',
   '[{"vehicleType":"Utilitaire 1T","quantity":3}]','2025-06-04',
   '{"street":"22 Rue du Commerce","city":"Bordeaux","zip":"33000"}',
   'IN_TRANSIT', NOW() - INTERVAL '2 days', NOW()),
  ('a1000000-0000-0000-0000-000000000005','f19979a8-ac3a-4d33-b2d5-66ef799bfec5','ORD-2025-005',
   '[{"vehicleType":"Fourgon 3T","quantity":1}]','2025-05-28',
   '{"street":"3 Place Bellecour","city":"Toulouse","zip":"31000"}',
   'DELIVERED', NOW() - INTERVAL '3 days', NOW()),
  ('a1000000-0000-0000-0000-000000000006','f19979a8-ac3a-4d33-b2d5-66ef799bfec5','ORD-2025-006',
   '[{"vehicleType":"Camion 5T","quantity":1}]','2025-05-30',
   '{"street":"17 Rue Victor Hugo","city":"Nice","zip":"06000"}',
   'REJECTED', NOW() - INTERVAL '4 days', NOW()),
  ('a1000000-0000-0000-0000-000000000007','f19979a8-ac3a-4d33-b2d5-66ef799bfec5','ORD-2025-007',
   '[{"vehicleType":"Frigo 8T","quantity":1}]','2025-06-05',
   '{"street":"56 Avenue de la Liberte","city":"Nantes","zip":"44000"}',
   'PENDING_VALIDATION', NOW() - INTERVAL '30 minutes', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO incidents (id, client_id, order_id, description, status, "createdAt", "updatedAt")
VALUES
  ('c1000000-0000-0000-0000-000000000001','f19979a8-ac3a-4d33-b2d5-66ef799bfec5',
   'a1000000-0000-0000-0000-000000000004',
   'Colis endommage lors du transport — marchandises fragiles abimees',
   'OPEN', NOW() - INTERVAL '4 hours', NOW()),
  ('c1000000-0000-0000-0000-000000000002','f19979a8-ac3a-4d33-b2d5-66ef799bfec5',
   'a1000000-0000-0000-0000-000000000003',
   'Retard de livraison — chauffeur bloque a cause de travaux sur A7',
   'IN_PROGRESS', NOW() - INTERVAL '1 day', NOW()),
  ('c1000000-0000-0000-0000-000000000003','f19979a8-ac3a-4d33-b2d5-66ef799bfec5',
   'a1000000-0000-0000-0000-000000000005',
   'Mauvaise adresse — livraison effectuee au mauvais etage',
   'RESOLVED', NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO NOTHING;

SELECT 'orders' as t, COUNT(*) FROM orders
UNION ALL SELECT 'incidents', COUNT(*) FROM incidents;
