from functions.analyzeABCAll import analyzeABCAll

data = [
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Бекшаев Александр",
        "student_id": 22,
        "values": [
            21,
            26
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Гулин Александр",
        "student_id": 23,
        "values": [
            23,
            29
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Дунин Матвей",
        "student_id": 24,
        "values": [
            43,
            24
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Исайкин Матвей",
        "student_id": 25,
        "values": [
            15,
            3
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Котелева Ксения",
        "student_id": 26,
        "values": [
            31,
            21
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Кулдыркаев Алексей",
        "student_id": 27,
        "values": [
            28,
            36
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Кунин Илья",
        "student_id": 28,
        "values": [
            40,
            31
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Куприянова Евангелина",
        "student_id": 29,
        "values": [
            30,
            47
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Осокина Анна",
        "student_id": 30,
        "values": [
            21,
            30
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Перфилова Елизавета",
        "student_id": 31,
        "values": [
            20,
            20
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Ризаева Ева",
        "student_id": 32,
        "values": [
            44,
            40
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Родькин Илья",
        "student_id": 33,
        "values": [
            16,
            20
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Самаркин Степан",
        "student_id": 34,
        "values": [
            34,
            37
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Сюмкин Матвей",
        "student_id": 35,
        "values": [
            21,
            25
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Тимофеева Екатерина",
        "student_id": 36,
        "values": [
            55,
            24
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Тулкин Степан",
        "student_id": 37,
        "values": [
            21,
            37
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Турханов Денис",
        "student_id": 38,
        "values": [
            25,
            32
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Ураев Максим",
        "student_id": 39,
        "values": [
            32,
            18
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Шлябин Степан",
        "student_id": 40,
        "values": [
            36,
            36
        ]
    },
    {
        "labels": [
            "2024-09",
            "2024-10"
        ],
        "student_fio": "Яшкина Анастасия",
        "student_id": 41,
        "values": [
            53,
            45
        ]
    }
]

res = analyzeABCAll(data,
                          thresholdA=0.7,
                          thresholdB=0.2,
                          analysisType='score')  # или 'attendance'

# Пример вывода для сентября:
import pprint
pprint.pprint(res)
