# Architecture

Le portail sert `/d/{publicDisplayId}`. Le backend public ne révèle aucun plan avant activation, puis délivre manifestes et rendus privés uniquement à une session active liée à l'organisation, au bâtiment et à l'emplacement. L'administration crée le code via une route JWT protégée par `DISPLAY_DEVICE_MANAGE`.
