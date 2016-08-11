MultiMusic

MultiPlayer game where you create music together


INSTALL

1. cd your/path/to/multimusic

2. npm istall


BUILD

1. npm run build


RUN

1. cd server

2. node server.js


TODO

1. пустая страничка
2. подключение по сокету и получение id
3. список мелодий на сервере
4. состояние клиента на сервере: id текущей мелодии, onair:1/0
4. получение клиентом текущего состояния
5. отображение списка мелодий на клиенте
6. нижний бар с прогрессбаром
7. кнопка live внизу с индикацией состояния
8. выбор мелодии
    8.1. отправка на сервер номера выбранной мелодии
    8.2. обновление состояния на сервере с уведомление об изменение
    8.3. отображение выбранной мелодии на клиенте
9. анимация прогрессбара (если есть выбранная мелодия)
10. переключение состояния кнопки live
    10.1. отправка серверу нового состояния кнопки
    10.2. отправка клиенту обратно нового состояния клиента
11. отправка музыкальному серверу OCS кодов
12. новая сетка
    12.1. разделение на область контента и тулбар
    12.2. область контента разделена на три колонки
    12.3. в средней колонке отображать логотип
13. два списка на сервере
    13.1. подредактировать и отдавать клиенту
    13.2. кнопок live под списком
    13.3. отображение списков
14. разделение тулбара на две части
15. применить новый стиль прогрессбара
    15.1. вернуть отображение прогрессбара
    15.2. стилизовать тулбар
16. добавить заглушку счётчика тактов

17. Поправить внешний вид под новую компоновку
    17.1. Тулбар и контент поменять местами
    17.2. Логотип в шапку
    17.3. Поменять шрифты на варианты тонкого
    17.4. Скроллбары
    17.5. Индикация активного состояния кнопки live рамка в 3px/заливка
    17.6. Отображение выбранного элемента списка

18. Добавить отображение имён списков
19. Поправить отправку комманд к муз серверу
20. Кнопка live как toggle для текущей мелодии
21. Кнопка live может быть активна только одна
