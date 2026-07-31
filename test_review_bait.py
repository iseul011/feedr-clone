# temporary file to test auto review — delete after test
def get_average(numbers):
    total = 0
    for n in numbers:
        total += n
    return total / len(numbers)  # crashes on empty list


def find_user(users, name):
    for i in range(len(users) + 1):  # off-by-one: index out of range
        if users[i] == name:
            return i
    return -1
