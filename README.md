
# Automaton Lab

A 2D cellular automata sandbox where rules can be changed on-the-fly through an embeded script editor.

At each simulation update, each cell (i.e., represented by a block in the grid) decides its next state based on its neighbors' and its own current state. During its update phase, a cell can only modify its next state and nothing more. So, for instance, to simulate something falling, one has to code it with two state changes:

    ? ? ?
    ? a ? => .
    ? . ?

    ? a ?
    ? . ? => a
    ? ? ?

In each 3x3 grid above, the central symbol represents the cell to be evaluated and the surrounding symbols represent its neighbors. An arrow indicates to which state the cell should transition when that arrangment matches its current state. `?` symbols simply mean that cell state doesn't take part in the decision. `a` reprents some block in the world, while `.` represents space in this context (but it's really just another block and nothing more).

Thus, in the first grid, if the cell's state is `a` and the cell below is empty (i.e., `.`), `a` will transition to a `.` in the next global state. Complementarily, the second grid commands an empty cell to become an `a` if there's an `a` above it in the current state. When those two rules are executed, this happens:

    . . . . .      . . . . .
    . a . . .      . . . . .
    . . . a .  =>  . a . . .
    . . . . .      . . . a .
    . . . . .      . . . . .

Giving the impression that all `a`s are falling.
