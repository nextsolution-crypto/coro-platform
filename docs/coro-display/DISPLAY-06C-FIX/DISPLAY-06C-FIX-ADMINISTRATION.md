# Administration des appareils

`DeviceAdministrationService` et les routes du `DisplayManagerController` prennent en charge création, invitation, affectation, transition et historique paginé. Chaque opération appelle `SpatialAuthorizationService`, vérifie l'organisation et le bâtiment, impose une permission DISPLAY explicite et écrit un `DisplayDeviceEvent`.

Les invitations remplacées sont invalidées. Les transitions terminales sont refusées et le verrou optimiste empêche l'écrasement concurrent. L'affectation exige une publication `PUBLISHED`, non révoquée, au même emplacement.
