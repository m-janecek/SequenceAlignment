import subprocess
import sys
import re

subprocess.check_call([sys.executable, "-m", "pip", "install", "biopython"])
from Bio import SeqIO
from Bio.Align.Applications import MuscleCommandline


# filter out durations and punctuation
def getText(text):
    result = re.sub(r'\W+', '', text)
    result = re.sub(r'[\d-]', '', result)
    return result


# get index of state
def getNum(status):
    if status == "A":
        return 0
    elif status == "B":
        return 1
    elif status == "C":
        return 2
    elif status == "D":
        return 3
    elif status == "E":
        return 4
    elif status == "F":
        return 5
    elif status == "G":
        return 6
    elif status == "H":
        return 7
    elif status == "I":
        return 8
    elif status == "U":
        return 9
    elif status == "K":
        return 10
    elif status == "L":
        return 11
    else:
        return -1


class Entry:
    def __init__(self):
        self.times = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        self.counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        self.blanks = 0

    def updateBlanks(self):
        self.blanks += 1

    def updateEntry(self, status, time):
        i = getNum(status)
        self.times[i] += time
        self.counts[i] += 1

    def getStatusAverageTime(self, status):
        i = getNum(status)
        if self.counts[i] == 0:
            return 0
        else:
            return self.times[i] / self.counts[i]

muscle_exe = "muscle3.8.31_i86win32.exe"
sample_input = open("./data/sample_execution.txt")
normal_input = open("./data/normal_group.txt")
fasta = "./data/normal.fasta"
out = "./data/aligned.fasta"

sample = sample_input.readline().strip()
print("Examining item:", getText(sample))
normal = []
d = normal_input.readline().strip()
while d:
    d = normal_input.readline().strip()
    if not d == '':
        normal.append(d)

print("Number of normal executions: ", len(normal))

print("Generating .fasta file")
# Create .fasta file for alignment
f = open(fasta, "w")
for x in range(0, len(normal)):
    f.write(">" + str(x) + '\n')
    f.write(getText(normal[x]) + '\n')
f.write(">Sample\n")
f.write(getText(sample))
f.close()

print("Starting MSA...")
muscle_cline = MuscleCommandline(muscle_exe, input=fasta, out=out)
muscle_cline()

records = list(SeqIO.parse(out, "fasta"))
aligned_seq = [''] * len(normal)
aligned_sample = ""
for r in records:
    if r.name == "Sample":
        aligned_sample = str(r.seq)
    else:
        aligned_seq[int(r.name)] = str(r.seq)

print("Extracting normal data")
aligned_length = len(aligned_sample)
normal_entries = []
for x in range(aligned_length):
    normal_entries.append(Entry())

# for each normal execution
for e in range(len(aligned_seq)):
    execution = normal[e].split(",")
    tracker = 0
    # for each position in aligned execution
    for p in range(aligned_length):
        if not aligned_seq[e][p] == '-':
            s = execution[tracker].split(":")[0]
            d = int(execution[tracker].split(":")[1])
            normal_entries[p].updateEntry(s, d)
            tracker += 1

print("Comparing sample to normal data")
tracker = 0
execution = sample.split(",")
for p in range(aligned_length):
    if not aligned_sample[p] == '-':
        dur = int(re.sub('\D', '', execution[tracker]))
        ave = normal_entries[p].getStatusAverageTime(aligned_sample[p])
        diff = abs(dur - ave)
        if dur > ave:
            sign = "+"
        else:
            sign = "-"
        if diff > 100000000:
            print("Position: %d, State: %s, Difference from Average: %s%0.2fms" %(p, aligned_sample[p],sign, diff/1000000))
        tracker += 1

print("Done")
