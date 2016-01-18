import assert from 'assert';
import { cutBraces, titlestamp } from '../app/tracktools';

describe('tracktools', () => {
    describe('#cutBraces', () => {
        it('should cut out braces from a string', () => {
            assert.equal(cutBraces('2(    3)4'), '24');
            assert.equal(cutBraces('a(2)b(3)(4)c'), 'abc');
            assert.equal(cutBraces('(a(2   )b(3 [111()]   )(4)c)'), '');
            assert.equal(cutBraces('[a(2)b(   3)(4      )c)'), '');
            assert.equal(
                cutBraces(
                    'DJ Earl & DJ Taye: Wurkin Da Bass (Hyperdub 2014)').trim(),
                'DJ Earl & DJ Taye: Wurkin Da Bass');
            assert.equal(
                cutBraces(
                    'SUNN O))) live at Southwest Terror Fest III, Oct. 18th, 2014 (FULL SET)').trim(),
                'SUNN O live at Southwest Terror Fest III, Oct. 18th, 2014');
        });
    });

    describe('#titlestamp', () => {
        it('should produce sufficiently unique same trackid for various noisy titles of same track', () => {
            assert.equal(
                titlestamp('Okzharp - Dear Ribane feat Manthe (Hyperdub 2015)'),
                titlestamp('OKZHARP: dear ribane FT Manthe'));
            assert.equal(
                titlestamp('Epoch - Attraction Dub [IMX001] [WinWax002]'),
                titlestamp('11.epoch_ Attraction Dub (deep dubstep)'));
            assert.equal(
                titlestamp('The Bug Ft. Flowdan - Jah War (Loefah Remix) (HD)'),
                titlestamp('The Bug Feat Flowdan - Jah War'));
            assert.equal(
                titlestamp('Mungo\'s Hi-Fi (Feat Charlie P) - Rules Of The Dance (Kahn Remix)'),
                titlestamp('Mungos HIFI Rules of the Dance'));
            assert.equal(titlestamp('효린X범키X주영').length, 8);
            assert.equal(
                titlestamp('[MV] 효린X범키X주영_ Love Line (Hyolyn, Bumkey, Jooyoung)'),
                titlestamp('효린X범키X주영 - Love Line'));
            assert.equal(titlestamp('PHARAOH-СКВИРТ В ЛИЦО').length, 18);
        });
    });
});
