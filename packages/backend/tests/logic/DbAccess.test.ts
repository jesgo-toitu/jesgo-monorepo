import { DbAccess } from '../../backendapp/logic/DbAccess';


test('connectOk', () => {
    expect.assertions(1);
    const dbAccess = new DbAccess();
    return dbAccess.connect("localhost", 5432, "postgres", "12345678", "jesgo_db").then(result => {
        expect(true).toBeTruthy();
    })
});

test('connectMistake', () => {
    expect.assertions(1);
    const dbAccess = new DbAccess();
    return dbAccess.connect("localhost", 5432, "postgres", "0000", "jesgo_db").then(result => {
        // ここにはこないはず
    })
        .catch(e => {
            expect(e.message).toEqual(expect.anything());
        });
});

test('connectWithConf', () => {
    expect.assertions(1);
    const dbAccess = new DbAccess();
    return dbAccess.connectWithConf().then(result => {
        // 何かしらのクエリが通ることを確認
        return dbAccess.query("SELECT * FROM jesgo_user").then(ret => {
            expect(ret).toEqual(expect.anything());
        });
    });
});